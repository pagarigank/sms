import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationTemplate } from './notification-template.entity';
import { NotificationRule } from './notification-rule.entity';
import { ChannelConfig } from './channel-config.entity';
import { NotificationLog } from './notification-log.entity';
import { Announcement } from './announcement.entity';
import { MessageThread } from './message-thread.entity';
import { Message } from './message.entity';
import { ConfigEngineService } from '../config/config-engine.service';

@Injectable()
export class CommunicationsService {
  private readonly logger = new Logger(CommunicationsService.name);

  constructor(
    @InjectRepository(NotificationTemplate) private templatesRepo: Repository<NotificationTemplate>,
    @InjectRepository(NotificationRule) private rulesRepo: Repository<NotificationRule>,
    @InjectRepository(ChannelConfig) private channelsRepo: Repository<ChannelConfig>,
    @InjectRepository(NotificationLog) private logsRepo: Repository<NotificationLog>,
    @InjectRepository(Announcement) private announcementsRepo: Repository<Announcement>,
    @InjectRepository(MessageThread) private threadsRepo: Repository<MessageThread>,
    @InjectRepository(Message) private messagesRepo: Repository<Message>,
    private readonly configEngine: ConfigEngineService,
  ) {}

  // === Templates ===
  async getTemplates(tenantId: string, eventType?: string) {
    const where: any = { tenantId, isActive: true };
    if (eventType) where.eventType = eventType;
    return this.templatesRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async createTemplate(data: Partial<NotificationTemplate>) {
    const template = this.templatesRepo.create(data);
    return this.templatesRepo.save(template);
  }

  async updateTemplate(id: string, tenantId: string, data: Partial<NotificationTemplate>) {
    const template = await this.templatesRepo.findOne({ where: { id, tenantId } });
    if (!template) throw new NotFoundException('Template not found');
    Object.assign(template, data);
    return this.templatesRepo.save(template);
  }

  // === Rules ===
  async getRules(tenantId: string) {
    return this.rulesRepo.find({ where: { tenantId, isActive: true }, order: { createdAt: 'DESC' } });
  }

  async createRule(data: Partial<NotificationRule>) {
    const rule = this.rulesRepo.create(data);
    return this.rulesRepo.save(rule);
  }

  // === Channel Configs ===
  async getChannelConfigs(tenantId: string, branchId?: string) {
    const where: any = { tenantId, isActive: true };
    if (branchId) where.branchId = branchId;
    return this.channelsRepo.find({ where });
  }

  async createChannelConfig(data: Partial<ChannelConfig>) {
    const config = this.channelsRepo.create(data);
    return this.channelsRepo.save(config);
  }

  // === Dispatch (stub — wires to real provider in Phase 8.1 final) ===
  async dispatch(data: {
    tenantId: string; branchId: string; eventType: string;
    recipientUserId: string | null;
    /** FR-CFG-8: gate dispatch on a tenant/branch feature flag when callers
     * name one (e.g. 'notifications.sms'). Unnamed → behavior unchanged. */
    featureFlag?: string;
    /** Legacy single-contact form, used as fallback for every channel. */
    recipientContact?: string;
    /** Channel-specific contacts: an sms template uses the phone, an email
     * template the address. Takes precedence over `recipientContact`. */
    recipientPhone?: string | null;
    recipientEmail?: string | null;
    variables: Record<string, any>;
  }) {
    // Find matching rules for this event type (rules ARE tenant-scoped —
    // the previous code matched `tenantId = eventType` and never sent anything)
    const rules = await this.rulesRepo.find({
      where: { tenantId: data.tenantId, eventType: data.eventType, isActive: true },
    });

    const results = [];
    for (const rule of rules) {
      const template = await this.templatesRepo.findOne({ where: { id: rule.templateId, tenantId: data.tenantId } });
      if (!template) continue;

      // A contact only reaches its channel: an sms template needs a phone, an
      // email template needs an address — skip mismatched pairs instead of
      // logging an undeliverable notification.
      const contact =
        template.channel === 'sms'
          ? String(data.recipientPhone ?? data.recipientContact ?? '')
          : String(data.recipientEmail ?? data.recipientContact ?? '');
      if (!contact) continue;
      if (template.channel === 'email' && !contact.includes('@')) continue;

      // Resolve merge fields
      let body = template.bodyTemplate;
      for (const [key, value] of Object.entries(data.variables)) {
        body = body.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
      }

      // FR-CFG-8: feature-flag gate. A disabled flag suppresses the send and
      // records the suppression so the audit trail shows why nothing went out.
      if (data.featureFlag) {
        const enabled = await this.configEngine.isFlagEnabled(data.tenantId, data.featureFlag, {
          branchId: data.branchId,
          subjectId: data.recipientUserId ?? undefined,
        });
        if (!enabled) {
          await this.logsRepo.save(
            this.logsRepo.create({
              tenantId: data.tenantId,
              branchId: data.branchId,
              templateId: template.id,
              channel: template.channel,
              recipientUserId: data.recipientUserId,
              recipientContact: contact,
              payload: { ...data.variables, suppressedBy: `feature-flags:${data.featureFlag}` },
              status: 'suppressed',
            }),
          );
          return []; // suppression is recorded in the log row above
        }
      }

      // Record the dispatch intent. No SMS/email/push provider is wired yet
      // (Phase 8.1), so the log stays in `queued` - never `sent`. The payload
      // carries an explicit marker so the audit trail shows that nothing was
      // actually transmitted, instead of faking a delivery.
      const log = this.logsRepo.create({
        tenantId: data.tenantId,
        branchId: data.branchId,
        templateId: template.id,
        channel: template.channel,
        recipientUserId: data.recipientUserId,
        recipientContact: contact,
        payload: {
          ...data.variables,
          _delivery: {
            status: 'queued',
            provider: 'unconfigured',
            note: 'No SMS/email/push provider configured; intent recorded only.',
          },
        },
        status: 'queued',
      });
      await this.logsRepo.save(log);

      this.logger.warn(
        `Notification queued but NOT transmitted (provider unconfigured) - ` +
          `rule ${rule.id}, template ${template.id}, channel ${template.channel}, ` +
          `contact ${contact}`,
      );

      results.push(log);
    }

    return results;
  }

  async getNotificationLogs(tenantId: string, params?: { recipientUserId?: string; status?: string }) {
    const where: any = { tenantId };
    if (params?.recipientUserId) where.recipientUserId = params.recipientUserId;
    if (params?.status) where.status = params.status;
    return this.logsRepo.find({ where, order: { createdAt: 'DESC' }, take: 100 });
  }

  // === Announcements ===
  async getAnnouncements(tenantId: string, branchId?: string) {
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;
    return this.announcementsRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async createAnnouncement(data: Partial<Announcement>) {
    const announcement = this.announcementsRepo.create(data);
    return this.announcementsRepo.save(announcement);
  }

  async publishAnnouncement(id: string, tenantId: string) {
    const announcement = await this.announcementsRepo.findOne({ where: { id, tenantId } });
    if (!announcement) throw new NotFoundException('Announcement not found');
    // Queue intent only: no broadcast provider is wired yet. `sentAt` here is
    // the queue timestamp - the audience is NOT actually notified until a
    // ChannelConfig-backed provider exists (Phase 8.1).
    announcement.sentAt = new Date();
    return this.announcementsRepo.save(announcement);
  }

  // === Messages ===
  async getThreads(tenantId: string, userId?: string) {
    // Privacy: non-empty userId scopes to threads the user participates in.
    // Empty (admin/tooling) sees all tenant threads.
    const qb = this.threadsRepo
      .createQueryBuilder('t')
      .where('t.tenantId = :tenantId', { tenantId })
      .orderBy('t.updatedAt', 'DESC');
    if (userId) {
      qb.andWhere('t.participantIds @> CAST(:ids AS jsonb)', { ids: JSON.stringify([userId]) });
    }
    return qb.getMany();
  }

  async createThread(data: { tenantId: string; branchId: string; subject?: string; studentId?: string; createdBy: string; participantIds?: string[] }) {
    // The creator is always a participant; de-duplicate ids.
    const participantIds = Array.from(new Set([...(data.participantIds ?? []), data.createdBy].filter(Boolean)));
    const thread = this.threadsRepo.create({ ...data, participantIds });
    return this.threadsRepo.save(thread);
  }

  async getThreadMessages(threadId: string, tenantId: string) {
    return this.messagesRepo.find({ where: { threadId, tenantId }, order: { createdAt: 'ASC' } });
  }

  async sendMessage(data: { tenantId: string; threadId: string; senderUserId: string; body: string }) {
    const message = this.messagesRepo.create(data);
    const saved = await this.messagesRepo.save(message);
    // Keep thread ordering current (threads list sorts by updatedAt) and
    // make the sender a participant so they see the thread in their list.
    const thread = await this.threadsRepo.findOne({ where: { id: data.threadId, tenantId: data.tenantId } });
    if (thread) {
      const participants = Array.isArray(thread.participantIds) ? thread.participantIds : [];
      if (!participants.includes(data.senderUserId)) {
        thread.participantIds = [...participants, data.senderUserId];
      }
      thread.updatedAt = new Date();
      await this.threadsRepo.save(thread);
    }
    return saved;
  }

  async markRead(messageId: string, tenantId: string) {
    const message = await this.messagesRepo.findOne({ where: { id: messageId, tenantId } });
    if (!message) throw new NotFoundException('Message not found');
    message.readAt = new Date();
    return this.messagesRepo.save(message);
  }
}
