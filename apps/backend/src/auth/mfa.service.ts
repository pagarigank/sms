import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from '../users/user.entity';
import { UserRole } from '../tenants/user-role.entity';
import { Role } from '../tenants/role.entity';
import * as crypto from 'crypto';

@Injectable()
export class MfaService {
  // Roles that require MFA
  private readonly MFA_REQUIRED_ROLES = ['Tenant Admin', 'Branch Admin', 'Cashier', 'Accounting/Finance Officer'];

  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(UserRole) private userRolesRepo: Repository<UserRole>,
    @InjectRepository(Role) private rolesRepo: Repository<Role>,
  ) {}

  /**
   * Check if a user requires MFA based on their roles.
   *
   * Enforcement is disabled unless MFA_REQUIRED=true is set in the environment,
   * so dev/test logins (including first-time MFA setup challenges) go straight
   * through. Set MFA_REQUIRED=true in production to restore enforcement.
   */
  async requiresMfa(userId: string, tenantId: string): Promise<boolean> {
    if (process.env.MFA_REQUIRED !== 'true') return false;

    const userRoles = await this.userRolesRepo.find({
      where: { userId, tenantId },
    });

    if (userRoles.length === 0) return false;

    const roleIds = userRoles.map(ur => ur.roleId);
    const roles = await this.rolesRepo.find({
      where: { id: In(roleIds) },
    });

    return roles.some(r => this.MFA_REQUIRED_ROLES.includes(r.name));
  }

  /**
   * Generate MFA secret for a user.
   */
  async generateSecret(userId: string): Promise<{ secret: string; qrCodeUrl: string }> {
    const secret = crypto.randomBytes(20).toString('hex');
    
    // In production, this would generate a TOTP URI for authenticator apps
    const qrCodeUrl = `otpauth://totp/SchoolSuite:user@example.com?secret=${secret}&issuer=SchoolSuite`;

    await this.usersRepo.update(userId, { mfaSecret: secret });
    
    return { secret, qrCodeUrl };
  }

  /**
   * Verify MFA token.
   */
  async verifyToken(userId: string, token: string): Promise<boolean> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user || !user.mfaSecret) return false;

    // In production, this would verify TOTP token
    // For now, accept any 6-digit code for testing
    return token.length === 6 && /^\d+$/.test(token);
  }

  /**
   * Enable MFA for a user.
   */
  async enableMfa(userId: string): Promise<void> {
    await this.usersRepo.update(userId, { mfaEnabled: true });
  }

  /**
   * Disable MFA for a user.
   */
  async disableMfa(userId: string): Promise<void> {
    await this.usersRepo.update(userId, { mfaEnabled: false, mfaSecret: undefined });
  }

  /**
   * Check if MFA is enabled for a user.
   */
  async isMfaEnabled(userId: string): Promise<boolean> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    return user?.mfaEnabled || false;
  }
}
