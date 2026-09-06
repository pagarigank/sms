import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSession } from './user-session.entity';

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(UserSession)
    private sessionRepo: Repository<UserSession>,
  ) {}

  /**
   * Record a login event. Called from AuthService.login / verifyMfa /
   * guardian login paths. Hash the JWT access token so the session record
   * can be correlated with a specific token for termination.
   */
  async recordLogin(params: {
    userId: string;
    tenantId: string;
    sessionTokenHash?: string;
    ipAddress?: string;
    userAgent?: string;
    expiresAt: Date;
  }): Promise<UserSession> {
    const session = this.sessionRepo.create({
      userId: params.userId,
      tenantId: params.tenantId,
      sessionTokenHash: params.sessionTokenHash ?? '',
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      loginAt: new Date(),
      lastActivityAt: new Date(),
      expiresAt: params.expiresAt,
      isForceTerminated: false,
    });
    return this.sessionRepo.save(session);
  }

  /**
   * Touch lastActivityAt on an existing session (called periodically via
   * a heartbeat endpoint, or on each authenticated request — lightweight).
   */
  async touchSession(sessionId: string): Promise<void> {
    await this.sessionRepo.update(sessionId, {
      lastActivityAt: new Date(),
    });
  }

  /**
   * Record a logout / session termination event.
   */
  async recordLogout(sessionId: string, terminatedBy?: string): Promise<void> {
    await this.sessionRepo.update(sessionId, {
      logoutAt: new Date(),
      isForceTerminated: terminatedBy ? true : undefined,
      terminatedBy: terminatedBy ?? null,
    });
  }

  /**
   * Terminate all active sessions for a user (e.g. password change,
   * admin force-terminate).
   */
  async terminateAllForUser(userId: string, terminatedBy?: string): Promise<number> {
    const result = await this.sessionRepo.update(
      { userId, logoutAt: null },
      {
        logoutAt: new Date(),
        isForceTerminated: true,
        terminatedBy: terminatedBy ?? null,
      },
    );
    return result.affected ?? 0;
  }

  /**
   * Find active sessions for a user (for a "manage sessions" UI).
   */
  async getActiveSessionsForUser(userId: string): Promise<UserSession[]> {
    return this.sessionRepo.find({
      where: { userId, logoutAt: null },
      order: { loginAt: 'DESC' },
    });
  }

  /**
   * Simple hash so we can store a token fingerprint without storing the
   * raw token. SHA-256 is one-way — we cannot recover the token, only
   * compare a presented token's hash against stored sessions for
   * termination purposes.
   */
  hashToken(token: string): string {
    // Node crypto available at runtime; keep this simple and sync
    // because we only call it at login time.
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
