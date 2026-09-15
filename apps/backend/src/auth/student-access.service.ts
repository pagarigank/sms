import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Guardian } from '../sis/guardian.entity';
import { StudentGuardian } from '../sis/student-guardian.entity';
import { UserPersonLink } from '../users/user-person-link.entity';
import { MessageThread } from '../communications/message-thread.entity';

/**
 * Resolves what a *self-service* caller (a guardian or student portal user who
 * holds no staff permissions) is allowed to see.
 *
 * Background: `api-permissions.ts` intentionally exempts portal endpoints from
 * permission checks, because Guardian/Student roles hold no staff permission.
 * That left them authenticated-only, so any authenticated portal user could
 * read another family's statement of account / grades by editing the
 * `studentId` in the URL (IDOR). `SelfServiceScopeGuard` now narrows those
 * routes to this service's ownership answer.
 *
 * Ownership source of truth (not ReBAC edges, which are never populated):
 *   users.id → guardians.userId → student_guardians.studentId
 *   users.id → user_person_links (personType = 'student') → personId
 *
 * (personType is a varchar discriminator, not a uuid — migration 002b
 * corrects the column so it can be filtered on in SQL.)
 */
@Injectable()
export class StudentAccessService {
  constructor(
    @InjectRepository(Guardian) private guardiansRepo: Repository<Guardian>,
    @InjectRepository(StudentGuardian) private studentGuardiansRepo: Repository<StudentGuardian>,
    @InjectRepository(UserPersonLink) private personLinksRepo: Repository<UserPersonLink>,
    @InjectRepository(MessageThread) private threadsRepo: Repository<MessageThread>,
  ) {}

  /**
   * Every student the caller may access as themselves: their children (guardian
   * profile) plus their own student record, if any. Empty for a user who is
   * neither a guardian nor a student.
   */
  async accessibleStudentIds(userId: string, tenantId: string): Promise<string[]> {
    if (!userId || !tenantId) return [];
    const ids = new Set<string>();

    const guardian = await this.guardiansRepo.findOne({ where: { userId, tenantId } });
    if (guardian) {
      const links = await this.studentGuardiansRepo.find({
        where: { guardianId: guardian.id, tenantId },
      });
      for (const link of links) ids.add(link.studentId);
    }

    const personLinks = await this.personLinksRepo.find({
      where: { userId, tenantId, personType: 'student' },
    });
    for (const link of personLinks) ids.add(link.personId);

    return [...ids];
  }

  async canAccessStudent(userId: string, tenantId: string, studentId: string): Promise<boolean> {
    if (!studentId) return false;
    const ids = await this.accessibleStudentIds(userId, tenantId);
    return ids.includes(studentId);
  }

  /** Throws `Forbidden` unless the caller owns `studentId`. */
  async assertStudentAccess(userId: string, tenantId: string, studentId: string): Promise<void> {
    if (!studentId) return;
    const allowed = await this.canAccessStudent(userId, tenantId, studentId);
    if (!allowed) {
      throw new ForbiddenException('Access denied: this student is not linked to your account');
    }
  }

  /** Throws `Forbidden` unless the caller participates in `threadId`. */
  async assertThreadAccess(userId: string, tenantId: string, threadId: string): Promise<void> {
    if (!threadId) return;
    const thread = await this.threadsRepo.findOne({ where: { id: threadId, tenantId } });
    // A thread the caller cannot see is reported as forbidden rather than
    // not-found so the endpoint does not leak existence across tenants.
    if (!thread) throw new ForbiddenException('Access denied: conversation not found');
    const participants = Array.isArray(thread.participantIds) ? thread.participantIds : [];
    if (!participants.includes(userId)) {
      throw new ForbiddenException('Access denied: you are not a participant in this conversation');
    }
  }
}
