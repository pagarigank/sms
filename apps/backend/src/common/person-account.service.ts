import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/user.entity';
import { UserRole } from '../tenants/user-role.entity';

@Injectable()
export class PersonAccountService {
  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(UserRole) private userRolesRepo: Repository<UserRole>,
  ) {}

  /**
   * Auto-provision a guardian account when a student is enrolled.
   */
  async provisionGuardianAccount(data: {
    tenantId: string;
    email?: string;
    phone?: string;
    firstName: string;
    lastName: string;
    role?: string;
  }): Promise<User> {
    // Check if account already exists
    if (data.email) {
      const existing = await this.usersRepo.findOne({
        where: { email: data.email, tenantId: data.tenantId },
      });
      if (existing) return existing;
    }

    // Create account with temporary password
    const tempPassword = this.generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const user = this.usersRepo.create({
      email: data.email,
      phone: data.phone,
      passwordHash,
      tenantId: data.tenantId,
      status: 'pending', // Pending until first login
    });

    const saved = await this.usersRepo.save(user);

    // Assign default role
    if (data.role) {
      // Find the role by name for this tenant
      const userRole = this.userRolesRepo.create({
        userId: saved.id,
        roleId: data.role, // This should be the role ID, not name
        tenantId: data.tenantId,
      });
      await this.userRolesRepo.save(userRole);
    }

    // In production: send welcome email/SMS with temp password or magic link
    console.log(`[DEV] Guardian account provisioned: ${data.email || data.phone}, temp password: ${tempPassword}`);

    return saved;
  }

  /**
   * Auto-provision a student account when enrolled.
   */
  async provisionStudentAccount(data: {
    tenantId: string;
    studentId: string;
    email?: string;
    phone?: string;
    firstName: string;
    lastName: string;
  }): Promise<User> {
    // Students typically don't have accounts until SHS/College
    // For basic ed, accounts are for guardians only
    if (data.email) {
      const existing = await this.usersRepo.findOne({
        where: { email: data.email, tenantId: data.tenantId },
      });
      if (existing) return existing;
    }

    const tempPassword = this.generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const user = this.usersRepo.create({
      email: data.email,
      phone: data.phone,
      passwordHash,
      tenantId: data.tenantId,
      status: 'pending',
    });

    return this.usersRepo.save(user);
  }

  /**
   * Activate account on first login.
   */
  async activateAccount(userId: string, newPassword: string): Promise<void> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    if (user.status !== 'pending') {
      throw new BadRequestException('Account is not pending activation');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.usersRepo.update(userId, {
      passwordHash,
      status: 'active',
    });
  }

  /**
   * Deactivate account (on transfer/withdrawal).
   */
  async deactivateAccount(userId: string, reason: string): Promise<void> {
    await this.usersRepo.update(userId, {
      status: 'inactive',
    });

    // Remove all role assignments
    await this.userRolesRepo.delete({ userId });

    // In production: log to audit_events
    console.log(`[AUDIT] Account deactivated: ${userId}, reason: ${reason}`);
  }

  /**
   * Get account status.
   */
  async getAccountStatus(userId: string): Promise<{ status: string; lastLoginAt?: Date; createdAt: Date }> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    return {
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }

  private generateTempPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
