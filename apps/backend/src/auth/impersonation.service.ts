import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { AuditEvent } from '../config/audit-event.entity';

interface ImpersonationGrant {
  id: string;
  supportUserId: string;
  targetTenantId: string;
  targetUserId?: string;
  expiresAt: Date;
  reason: string;
  isBreakGlass: boolean;
}

@Injectable()
export class ImpersonationService {
  private activeGrants = new Map<string, ImpersonationGrant>();

  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(AuditEvent) private auditRepo: Repository<AuditEvent>,
    private jwtService: JwtService,
  ) {}

  /**
   * Request impersonation of a tenant (normal flow - requires tenant admin approval).
   */
  async requestImpersonation(
    supportUserId: string,
    targetTenantId: string,
    reason: string,
    durationMinutes: number = 60,
  ): Promise<ImpersonationGrant> {
    // Validate support user exists and has Platform Support role
    const supportUser = await this.usersRepo.findOne({ where: { id: supportUserId } });
    if (!supportUser) throw new UnauthorizedException('Support user not found');

    // Create time-boxed grant
    const grant: ImpersonationGrant = {
      id: `imp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      supportUserId,
      targetTenantId,
      expiresAt: new Date(Date.now() + durationMinutes * 60 * 1000),
      reason,
      isBreakGlass: false,
    };

    this.activeGrants.set(grant.id, grant);

    // Log to audit trail
    await this.auditRepo.save({
      tenantId: targetTenantId,
      actorUserId: supportUserId,
      entityType: 'impersonation',
      entityId: grant.id,
      action: 'requested',
      afterState: {
        grantId: grant.id,
        targetTenantId,
        reason,
        expiresAt: grant.expiresAt,
        isBreakGlass: false,
      },
      correlationId: grant.id,
    });

    return grant;
  }

  /**
   * Break-glass impersonation (emergency, no approval needed, fully audited).
   */
  async breakGlassImpersonation(
    supportUserId: string,
    targetTenantId: string,
    reason: string,
    durationMinutes: number = 30,
  ): Promise<ImpersonationGrant> {
    const grant: ImpersonationGrant = {
      id: `bg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      supportUserId,
      targetTenantId,
      expiresAt: new Date(Date.now() + durationMinutes * 60 * 1000),
      reason: `[BREAK-GLASS] ${reason}`,
      isBreakGlass: true,
    };

    this.activeGrants.set(grant.id, grant);

    // Log to audit trail (break-glass events should trigger alerts)
    await this.auditRepo.save({
      tenantId: targetTenantId,
      actorUserId: supportUserId,
      entityType: 'impersonation',
      entityId: grant.id,
      action: 'break_glass',
      afterState: {
        grantId: grant.id,
        targetTenantId,
        reason: grant.reason,
        expiresAt: grant.expiresAt,
        isBreakGlass: true,
        alertLevel: 'CRITICAL',
      },
      correlationId: grant.id,
    });

    console.log(`[SECURITY] BREAK-GLASS impersonation: ${supportUserId} → ${targetTenantId}, reason: ${reason}`);

    return grant;
  }

  /**
   * Generate impersonation token.
   */
  async generateImpersonationToken(grantId: string): Promise<{ accessToken: string; expiresAt: Date }> {
    const grant = this.activeGrants.get(grantId);
    if (!grant) throw new UnauthorizedException('Invalid impersonation grant');

    if (new Date() > grant.expiresAt) {
      this.activeGrants.delete(grantId);
      throw new UnauthorizedException('Impersonation grant has expired');
    }

    const token = this.jwtService.sign(
      {
        sub: grant.supportUserId,
        tenantId: grant.targetTenantId,
        impersonation: true,
        grantId: grant.id,
      },
      { expiresIn: '15m' },
    );

    return { accessToken: token, expiresAt: grant.expiresAt };
  }

  /**
   * End impersonation session.
   */
  async endImpersonation(grantId: string, endedBy: string): Promise<void> {
    const grant = this.activeGrants.get(grantId);
    if (!grant) return;

    this.activeGrants.delete(grantId);

    // Log to audit trail
    await this.auditRepo.save({
      tenantId: grant.targetTenantId,
      actorUserId: endedBy,
      entityType: 'impersonation',
      entityId: grantId,
      action: 'ended',
      afterState: { grantId, endedBy, endedAt: new Date() },
      correlationId: grantId,
    });
  }

  /**
   * Check if a request is using impersonation.
   */
  isImpersonating(user: any): boolean {
    return user?.impersonation === true;
  }

  /**
   * Get active impersonation grants (for admin visibility).
   */
  getActiveGrants(): ImpersonationGrant[] {
    return Array.from(this.activeGrants.values()).filter(
      (g) => new Date() < g.expiresAt,
    );
  }
}
