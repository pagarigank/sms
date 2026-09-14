export interface ImpersonationGrant {
  id: string;
  supportUserId: string;
  targetTenantId: string;
  targetUserId?: string;
  expiresAt: Date;
  reason: string;
  isBreakGlass: boolean;
}
