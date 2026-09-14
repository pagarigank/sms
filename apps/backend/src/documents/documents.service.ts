import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentTemplate } from './document-template.entity';
import { DocumentRequest } from './document-request.entity';
import { GeneratedDocument } from './generated-document.entity';
import * as crypto from 'crypto';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(DocumentTemplate) private templatesRepo: Repository<DocumentTemplate>,
    @InjectRepository(DocumentRequest) private requestsRepo: Repository<DocumentRequest>,
    @InjectRepository(GeneratedDocument) private generatedDocsRepo: Repository<GeneratedDocument>,
  ) {}

  // === Templates ===
  async getTemplates(tenantId: string, documentType?: string) {
    const where: any = { tenantId, isActive: true };
    if (documentType) where.documentType = documentType;
    return this.templatesRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async createTemplate(data: Partial<DocumentTemplate>) {
    const template = this.templatesRepo.create(data);
    return this.templatesRepo.save(template);
  }

  async updateTemplate(id: string, tenantId: string, data: Partial<DocumentTemplate>) {
    const template = await this.templatesRepo.findOne({ where: { id, tenantId } });
    if (!template) throw new NotFoundException('Template not found');
    Object.assign(template, data);
    return this.templatesRepo.save(template);
  }

  // === Requests ===
  async getRequests(tenantId: string, params?: { studentId?: string; status?: string }) {
    const where: any = { tenantId };
    if (params?.studentId) where.studentId = params.studentId;
    if (params?.status) where.status = params.status;
    return this.requestsRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async createRequest(data: Partial<DocumentRequest>) {
    const request = this.requestsRepo.create({
      ...data,
      status: 'requested',
      verificationCode: this.generateVerificationCode(),
    });
    return this.requestsRepo.save(request);
  }

  /**
   * Workflow transitions: requested → fee_assessed → paid → released,
   * with rejection allowed until released. Fee assessment happens when the
   * registrar moves a request from `requested` to `fee_assessed` (feeAmount
   * is set at creation from the template, or overridden).
   */
  async updateRequestStatus(id: string, tenantId: string, status: string) {
    const request = await this.requestsRepo.findOne({ where: { id, tenantId } });
    if (!request) throw new NotFoundException('Request not found');
    const allowed: Record<string, string[]> = {
      requested: ['fee_assessed', 'rejected'],
      fee_assessed: ['paid', 'rejected'],
      paid: ['released'],
      rejected: [],
      released: [],
    };
    if (!allowed[request.status]?.includes(status)) {
      throw new BadRequestException(`Cannot move request from ${request.status} to ${status}`);
    }
    request.status = status;
    return this.requestsRepo.save(request);
  }

  async approveRequest(id: string, tenantId: string, releasedBy: string) {
    const request = await this.requestsRepo.findOne({ where: { id, tenantId } });
    if (!request) throw new NotFoundException('Request not found');
    if (request.status !== 'paid' && request.status !== 'requested') {
      throw new BadRequestException(`Cannot release request in status: ${request.status}`);
    }
    request.status = 'released';
    request.releasedBy = releasedBy;
    request.releasedAt = new Date();
    return this.requestsRepo.save(request);
  }

  // === Generated Documents ===
  async generateDocument(data: {
    tenantId: string; branchId: string; studentId: string;
    templateId: string; requestId?: string;
  }) {
    const verificationCode = this.generateVerificationCode();
    const qrPayload = `SCH-${data.tenantId.substring(0, 8)}-${verificationCode}`;

    const doc = this.generatedDocsRepo.create({
      ...data,
      verificationCode,
      qrPayload,
      fileUrl: '', // Would be set after PDF generation
    });
    return this.generatedDocsRepo.save(doc);
  }

  async getGeneratedDocs(tenantId: string, studentId?: string) {
    const where: any = { tenantId };
    if (studentId) where.studentId = studentId;
    return this.generatedDocsRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async verifyDocument(verificationCode: string) {
    const doc = await this.generatedDocsRepo.findOne({ where: { verificationCode } });
    if (!doc) return { valid: false };
    return {
      valid: !doc.isVoided,
      document: {
        id: doc.id,
        studentId: doc.studentId,
        templateId: doc.templateId,
        verificationCode: doc.verificationCode,
        issuedAt: doc.createdAt,
        isVoided: doc.isVoided,
      },
    };
  }

  async voidDocument(id: string, tenantId: string) {
    const doc = await this.generatedDocsRepo.findOne({ where: { id, tenantId } });
    if (!doc) throw new NotFoundException('Document not found');
    doc.isVoided = true;
    return this.generatedDocsRepo.save(doc);
  }

  private generateVerificationCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const random = crypto.randomBytes(8).toString('hex').substring(0, 8).toUpperCase();
    return `SCH-${random}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  }
}
