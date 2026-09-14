import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/user.entity';
import { UserRole } from '../tenants/user-role.entity';
import { RolePermission } from '../tenants/role-permission.entity';
import { MfaService } from './mfa.service';
import { SessionService } from '../users/session.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
    private mfaService: MfaService,
    private sessionService: SessionService,
  ) {}

  async register(data: {
    email: string;
    password: string;
    tenantId?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    middleName?: string;
  }) {
    let tenantId = data.tenantId;
    if (!tenantId) {
      // Single-tenant convenience: resolve the tenant from the email domain
      // against tenant slug, or fall back to the first active tenant.
      const first = await this.usersRepository.manager
        .getRepository('Tenant')
        .createQueryBuilder('t')
        .where('t.status = :status', { status: 'active' })
        .getOne();
      tenantId = (first as any)?.id;
      if (!tenantId) {
        throw new NotFoundException('No active tenant found; tenantId is required');
      }
    }
    const existing = await this.usersRepository.findOne({
      where: { email: data.email, tenantId },
    });
    if (existing) {
      throw new ConflictException('Email already registered for this tenant');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = this.usersRepository.create({
      email: data.email,
      phone: data.phone,
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.middleName,
      passwordHash,
      tenantId,
    });
    const saved = await this.usersRepository.save(user);
    return this.generateTokens(saved);
  }

  async login(data: { email: string; password: string; tenantId?: string }, requestMeta?: { ipAddress?: string; userAgent?: string }) {
    const where = data.tenantId
      ? { email: data.email, tenantId: data.tenantId }
      : { email: data.email };
    const candidates = await this.usersRepository.find({ where });
    const user = candidates.find((u) => u.passwordHash);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is not active');
    }

    // Check if MFA is required for this user
    const mfaRequired = await this.mfaService.requiresMfa(user.id, user.tenantId);
    const mfaEnabled = await this.mfaService.isMfaEnabled(user.id);

    await this.usersRepository.update(user.id, { lastLoginAt: new Date() });
    // If MFA is required but not yet set up, return partial tokens
    if (mfaRequired && !mfaEnabled) {
      const tempToken = this.jwtService.sign(
        { sub: user.id, tenantId: user.tenantId, mfaPending: true },
        { expiresIn: '5m' }
      );
      return {
        mfaRequired: true,
        mfaSetupRequired: true,
        tempToken,
        user: { id: user.id, email: user.email, tenantId: user.tenantId },
      };
    }

    // If MFA is enabled, require verification
    if (mfaEnabled) {
      const tempToken = this.jwtService.sign(
        { sub: user.id, tenantId: user.tenantId, mfaPending: true },
        { expiresIn: '5m' }
      );
      return {
        mfaRequired: true,
        mfaSetupRequired: false,
        tempToken,
        user: { id: user.id, email: user.email, tenantId: user.tenantId },
      };
    }

    // No MFA required, generate full tokens
    return this.generateTokens(user, requestMeta);
  }

  async verifyMfa(userId: string, token: string, requestMeta?: { ipAddress?: string; userAgent?: string }) {
    const valid = await this.mfaService.verifyToken(userId, token);
    if (!valid) {
      throw new UnauthorizedException('Invalid MFA token');
    }

    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Enable MFA if this is first-time setup
    if (!user.mfaEnabled) {
      await this.mfaService.enableMfa(userId);
    }

    return this.generateTokens(user, requestMeta);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, { secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret' });
      const user = await this.usersRepository.findOneBy({ id: payload.sub });
      if (!user || user.status !== 'active') {
        throw new UnauthorizedException('Invalid refresh token');
      }
      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * POST /auth/logout — record session termination. Caller must pass the
   * active access token; we hash it to find the matching session record.
   * If no matching session is found (e.g. already expired), the logout
   * still succeeds — the important thing is the request was made.
   */
  async logout(accessToken: string, requestMeta?: { ipAddress?: string; userAgent?: string }) {
    const sessionHash = this.sessionService.hashToken(accessToken);
    let terminated = false;
    try {
      const sessions = await this.sessionService.getActiveSessionsForUser(
        // Decode the token to find the userId without verifying signature
        // (the token is still valid at this point since caller holds it).
        this.jwtService.decode(accessToken)?.sub as string ?? '',
      );
      const match = sessions.find((s) => s.sessionTokenHash === sessionHash);
      if (match) {
        await this.sessionService.recordLogout(match.id, undefined);
        terminated = true;
      }
    } catch (e: any) {
      console.warn('[session-audit] logout lookup failed:', e?.message);
    }
    // Always return success — the client should discard its tokens regardless.
    return { terminated, message: 'Logged out' };
  }

  async validateUser(userId: string): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User not found or inactive');
    }
    return user;
  }

  /**
   * GET /auth/tenant-lookup?slug=demo-school — public pre-auth endpoint so
   * the login page can resolve the tenant (subdomain/slug picker flow).
   */
  async lookupTenantBySlug(slug: string) {
    const tenant = await this.usersRepository.manager
      .getRepository('Tenant')
      .findOne({ where: { slug, status: 'active' } });
    if (!tenant) {
      throw new NotFoundException(`No active tenant with slug '${slug}'`);
    }
    return { id: (tenant as any).id, name: (tenant as any).name, slug: (tenant as any).slug };
  }

  /**
   * GET /auth/me — profile + effective permissions (role → role_permissions
   * → permissions) + tenant display name. Drives sidebar filtering and the
   * topbar identity in the portals.
   */
  async getMe(userId: string) {
    const user = await this.validateUser(userId);
    const roles = await this.usersRepository.manager.getRepository(UserRole).find({
      where: { userId },
    });
    const roleIds = roles.map((r) => r.roleId);
    const permissionCodes: string[] = [];
    let roleNames: string[] = [];
    if (roleIds.length > 0) {
      const roleRows = await this.usersRepository.manager
        .getRepository('Role')
        .find({ where: { id: In(roleIds) } });
      roleNames = roleRows.map((r: any) => r.name);
      const rolePerms = await this.usersRepository.manager
        .getRepository(RolePermission)
        .find({ where: { roleId: In(roleIds) } });
      const permIds = rolePerms.map((rp) => rp.permissionId);
      if (permIds.length > 0) {
        const perms = await this.usersRepository.manager
          .getRepository('Permission')
          .find({ where: { id: In(permIds) } });
        permissionCodes.push(...perms.map((p: any) => `${p.resource}:${p.action}`));
      }
    }
    const tenant = await this.usersRepository.manager
      .getRepository('Tenant')
      .findOneBy({ id: user.tenantId });
    const isPlatformAdmin = await this.isPlatformAdmin(userId);
    return {
      user: {
        id: user.id,
        email: user.email,
        tenantId: user.tenantId,
        firstName: user.firstName,
        lastName: user.lastName,
        middleName: user.middleName,
        status: user.status,
        mfaEnabled: user.mfaEnabled,
        lastLoginAt: user.lastLoginAt,
      },
      tenant: tenant ? { id: tenant.id, name: tenant.name, slug: tenant.slug } : null,
      roles: roleNames,
      permissions: permissionCodes,
      platformAdmin: isPlatformAdmin,
    };
  }

  async isPlatformAdmin(userId: string): Promise<boolean> {
    const role = await this.usersRepository.manager
      .getRepository('Role')
      .findOne({ where: { id: 'b0000000-0000-0000-0000-000000000001' } });
    if (!role) return false;
    const userRole = await this.usersRepository.manager
      .getRepository(UserRole)
      .findOne({ where: { userId, roleId: role.id } });
    return !!userRole;
  }

  private async generateTokens(user: User, requestMeta?: { ipAddress?: string; userAgent?: string }) {
    const platformAdmin = await this.isPlatformAdmin(user.id);
    const payload = { sub: user.id, tenantId: user.tenantId, email: user.email, platformAdmin };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      { secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret', expiresIn: '7d' },
    );
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    // Session audit: record the login event (OWASP ASVS session management)
    try {
      await this.sessionService.recordLogin({
        userId: user.id,
        tenantId: user.tenantId,
        sessionTokenHash: this.sessionService.hashToken(accessToken),
        ipAddress: requestMeta?.ipAddress,
        userAgent: requestMeta?.userAgent,
        expiresAt,
      });
    } catch (e: any) {
      // Session audit is best-effort; never let it block login.
      console.warn('[session-audit] recordLogin failed:', e?.message);
    }

    return { accessToken, refreshToken, user: { id: user.id, email: user.email, tenantId: user.tenantId } };
  }

}
