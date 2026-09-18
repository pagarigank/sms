import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Request, Get, Param, Query, Delete, Put } from '@nestjs/common';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { MfaService } from './mfa.service';
import { GuardianAuthService } from './guardian-auth.service';
import { ImpersonationService } from './impersonation.service';
import { ImpersonationGrant } from './impersonation.types';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Public } from './public.decorator';
import { PermissionsGuard, RequirePermission } from './permissions.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from '../users/user.entity';
import { UserRole } from '../tenants/user-role.entity';
import { Role } from '../tenants/role.entity';
import * as bcrypt from 'bcryptjs';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly mfaService: MfaService,
    private readonly guardianAuthService: GuardianAuthService,
    private readonly impersonationService: ImpersonationService,
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(UserRole) private userRolesRepo: Repository<UserRole>,
    @InjectRepository(Role) private rolesRepo: Repository<Role>,
  ) {}

  // === Staff Auth ===

  @Post('register')
  @UseGuards(JwtAuthGuard)
  @RequirePermission('tenancy.tenant', 'create')
  @ApiOperation({ summary: 'Register a new staff user in your own tenant' })
  register(@Body() body: { email: string; password: string; tenantId: string; phone?: string }) {
    return this.authService.register(body);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Staff login' })
  login(@Body() body: { email: string; password: string; tenantId?: string }, @Request() req: any) {
    return this.authService.login(body, {
      ipAddress: req.ip ?? req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('platform/impersonate/break-glass')
  @RequirePermission('platform.impersonation', 'use')
  @ApiOperation({ summary: 'Break-glass impersonation as platform admin' })
  async platformBreakGlass(@Request() req: any, @Body() body: { targetTenantId: string; reason: string }): Promise<ImpersonationGrant> {
    return this.impersonationService.breakGlassImpersonation(req.user.id, body.targetTenantId, body.reason);
  }

  @Public()
  @Get('tenant-lookup')
  @ApiOperation({ summary: 'Resolve tenant by slug (public, pre-auth)' })
  lookupTenant(@Query('slug') slug: string) {
    return this.authService.lookupTenantBySlug(slug);
  }

  // === MFA ===

  @Public()
  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify MFA token' })
  verifyMfa(@Body() body: { userId: string; token: string }, @Request() req: any) {
    return this.authService.verifyMfa(body.userId, body.token, {
      ipAddress: req.ip ?? req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('mfa/setup')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Setup MFA' })
  async setupMfa(@Request() req: any) {
    return this.mfaService.generateSecret(req.user.id);
  }

  // === Guardian/Student Auth ===

  @Public()
  @Post('guardian/register')
  @ApiOperation({ summary: 'Register guardian account' })
  registerGuardian(@Body() body: any) {
    return this.guardianAuthService.register(body);
  }

  @Public()
  @Post('guardian/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Guardian login with email/password' })
  loginGuardian(@Body() body: { email: string; password: string; tenantId: string }) {
    return this.guardianAuthService.loginWithPassword(body.email, body.password, body.tenantId);
  }

  @Public()
  @Post('guardian/otp/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request OTP for mobile login' })
  requestOtp(@Body() body: { phone: string; tenantId: string }) {
    return this.guardianAuthService.requestOtp(body.phone, body.tenantId);
  }

  @Public()
  @Post('guardian/otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and login' })
  verifyOtp(@Body() body: { phone: string; otp: string; tenantId: string }) {
    return this.guardianAuthService.verifyOtp(body.phone, body.otp, body.tenantId);
  }

  // === Impersonation ===

  @Post('impersonate/request')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Request impersonation (requires approval)' })
  requestImpersonation(@Request() req: any, @Body() body: { targetTenantId: string; reason: string }): Promise<import('./impersonation.types').ImpersonationGrant> {
    return this.impersonationService.requestImpersonation(req.user.id, body.targetTenantId, body.reason);
  }

  @Post('impersonate/break-glass')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Break-glass impersonation (emergency)' })
  breakGlass(@Request() req: any, @Body() body: { targetTenantId: string; reason: string }): Promise<ImpersonationGrant> {
    return this.impersonationService.breakGlassImpersonation(req.user.id, body.targetTenantId, body.reason);
  }

  @Post('impersonate/token/:grantId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get impersonation token' })
  getImpersonationToken(@Param('grantId') grantId: string) {
    return this.impersonationService.generateImpersonationToken(grantId);
  }

  @Post('impersonate/end/:grantId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End impersonation session' })
  endImpersonation(@Param('grantId') grantId: string, @Request() req: any) {
    return this.impersonationService.endImpersonation(grantId, req.user.id);
  }

  @Get('impersonate/active')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List active impersonation grants' })
  getActiveGrants(): ImpersonationGrant[] {
    return this.impersonationService.getActiveGrants();
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user profile + permissions' })
  getMe(@Request() req: any) {
    return this.authService.getMe(req.user.sub ?? req.user.id);
  }

  // === Platform Admin: User Management Across Tenants ===

  @Get('platform/users')
  @RequirePermission('platform.user', 'view')
  @ApiOperation({ summary: 'List all users across all tenants (platform admin only)' })
  async listAllUsers(@Request() req: any, @Query('tenantId') tenantId?: string) {
    // Platform admin can optionally filter by tenant
    const where: any = tenantId ? { tenantId } : {};
    const users = await this.usersRepo.find({ where });
    // Enrich each user with their roles + tenant name
    const enriched = await Promise.all(
      users.map(async (user) => {
        const roles = await this.userRolesRepo.find({ where: { userId: user.id } });
        const roleRows = await this.rolesRepo.find({ where: { id: In(roles.map((r) => r.roleId)) } });
        const tenant = await this.usersRepo.manager
          .getRepository('Tenant')
          .findOneBy({ id: user.tenantId });
        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          middleName: user.middleName,
          status: user.status,
          mfaEnabled: user.mfaEnabled,
          lastLoginAt: user.lastLoginAt,
          tenantId: user.tenantId,
          tenant: tenant ? { id: tenant.id, name: tenant.name, slug: tenant.slug } : null,
          roles: roleRows.map((r: any) => ({ id: r.id, name: r.name })),
        };
      }),
    );
    return enriched;
  }

  @Post('platform/users')
  @RequirePermission('platform.user', 'create')
  @ApiOperation({ summary: 'Create a user in a specific tenant (platform admin only)' })
  async createUser(
    @Request() req: any,
    @Body() body: { email: string; password: string; tenantId: string; firstName?: string; lastName?: string; roleIds?: string[] },
  ) {
    // Check tenant exists (platform admin bypass via RLS)
    const tenant = await this.usersRepo.manager
      .getRepository('Tenant')
      .findOneBy({ id: body.tenantId });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${body.tenantId} not found`);
    }

    // Check email not already taken in that tenant
    const existing = await this.usersRepo.findOne({ where: { email: body.email, tenantId: body.tenantId } });
    if (existing) {
      throw new ConflictException('Email already registered in this tenant');
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = this.usersRepo.create({
      email: body.email,
      passwordHash,
      tenantId: body.tenantId,
      firstName: body.firstName ?? '',
      lastName: body.lastName ?? '',
      status: 'active',
    });
    const saved = await this.usersRepo.save(user);

    // Assign roles if specified
    if (body.roleIds && body.roleIds.length > 0) {
      const roleRecords = await this.rolesRepo.find({ where: { id: In(body.roleIds) } });
      if (roleRecords.length !== body.roleIds.length) {
        throw new NotFoundException('One or more roles not found');
      }
      const userRoles = body.roleIds.map((roleId) =>
        this.userRolesRepo.create({ userId: saved.id, roleId, tenantId: body.tenantId }),
      );
      await this.userRolesRepo.save(userRoles);
    }

    return {
      id: saved.id,
      email: saved.email,
      tenantId: saved.tenantId,
      firstName: saved.firstName,
      lastName: saved.lastName,
      status: saved.status,
    };
  }

  @Put('platform/users/:userId/roles')
  @RequirePermission('platform.user', 'assign_role')
  @ApiOperation({ summary: 'Assign/replace roles for a user (platform admin only)' })
  async assignUserRoles(
    @Param('userId') userId: string,
    @Body() body: { tenantId: string; roleIds: string[] },
  ) {
    // Verify user exists
    const user = await this.usersRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    // Remove existing roles for this user in this tenant
    await this.userRolesRepo.delete({ userId, tenantId: body.tenantId });

    // Assign new roles
    if (body.roleIds.length > 0) {
      const roleRecords = await this.rolesRepo.find({ where: { id: In(body.roleIds) } });
      if (roleRecords.length !== body.roleIds.length) {
        throw new NotFoundException('One or more roles not found');
      }
      const userRoles = body.roleIds.map((roleId) =>
        this.userRolesRepo.create({ userId, roleId, tenantId: body.tenantId }),
      );
      await this.userRolesRepo.save(userRoles);
    }

    return { userId, tenantId: body.tenantId, roleIds: body.roleIds };
  }

  @Delete('platform/users/:userId')
  @RequirePermission('platform.user', 'view')
  @ApiOperation({ summary: 'Deactivate a user (platform admin only)' })
  async deactivateUser(@Param('userId') userId: string) {
    const user = await this.usersRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException(`User ${userId} not found`);
    user.status = 'inactive';
    await this.usersRepo.save(user);
    return { id: user.id, status: user.status };
  }

  // === Token Management ===

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refresh(body.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log out — terminate current session (audit-recorded)' })
  logout(
    @Body() body: { accessToken: string },
    @Request() req: any,
  ) {
    return this.authService.logout(body.accessToken, {
      ipAddress: req.ip ?? req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
    });
  }
}

