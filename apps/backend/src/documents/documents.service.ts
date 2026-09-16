import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { DocumentTemplate } from './document-template.entity';
import { DocumentRequest } from './document-request.entity';
import { GeneratedDocument } from './generated-document.entity';
import { PdfService, PdfBranding } from './pdf.service';
import { Student } from '../sis/student.entity';
import { Enrollment } from '../sis/enrollment.entity';
import { Tenant } from '../tenants/tenant.entity';
import { SchoolYear } from '../academic/school-year.entity';
import { GradeLevel } from '../academic/grade-level.entity';
import { EducationLevel } from '../education-levels/education-level.entity';
import { Subject } from '../academic/subject.entity';
import { ClassOffering } from '../scheduling/class-offering.entity';
import { GradeEntry } from '../scheduling/grade-entry.entity';
import * as crypto from 'crypto';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(DocumentTemplate) private templatesRepo: Repository<DocumentTemplate>,
    @InjectRepository(DocumentRequest) private requestsRepo: Repository<DocumentRequest>,
    @InjectRepository(GeneratedDocument) private generatedDocsRepo: Repository<GeneratedDocument>,
    private readonly pdf: PdfService,
  ) {}

  // === Branding preview ===
  /**
   * Render a sample page showing the header a generated document would carry
   * under the given branding. Mirrors generateDocument's branding resolution
   * (saved tenant branding, or an unsaved draft for the editor's "Preview"
   * button). Returns raw PDF bytes — nothing is stored, no DB record.
   */
  async previewBranding(input: {
    tenantId: string;
    brandingDraft?: Record<string, unknown> | null;
    sample?: string;
  }): Promise<Uint8Array> {
    const tenant = await this.templatesRepo.manager
      .getRepository(Tenant)
      .findOne({ where: { id: input.tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    // A draft (from the branding editor) wins over the saved branding; fall
    // back to the saved branding so "preview without edits" still works.
    const b = (input.brandingDraft ?? tenant.branding ?? {}) as Record<string, unknown>;

    // Same mapping generateDocument uses: editor key `logo` → `logoSource`.
    const branding: PdfBranding | undefined =
      b.primaryColor || b.logo || b.schoolName || b.tagline
        ? {
            primaryColor: b.primaryColor as string | undefined,
            secondaryColor: b.secondaryColor as string | undefined,
            accentColor: b.accentColor as string | undefined,
            schoolName: b.schoolName as string | undefined,
            tagline: b.tagline as string | undefined,
            footerText: b.footerText as string | undefined,
            logoSource: b.logo as string | undefined,
          }
        : undefined;

    const headerText = input.sample ?? 'Certificate of Enrollment';
    const subheader = ['School Year 2026-2027', 'SAMPLE - Not an official document'];

    return this.pdf.previewHeaderPdf({
      header: headerText,
      subheaderLines: subheader,
      tenantName: tenant.name,
      branding,
    });
  }

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
  /**
   * Render a real PDF for the request and register it.
   *
   * Merge data comes from live records (not client input): student identity,
   * school year + grade level from the latest enrollment, and — for records
   * (Form 137 / TOR) — finalized grade entries averaged per subject.
   */
  async generateDocument(data: {
    tenantId: string; branchId: string; studentId: string;
    templateId: string; requestId?: string;
  }) {
    const template = await this.templatesRepo.findOne({
      where: { id: data.templateId, tenantId: data.tenantId },
    });
    if (!template) throw new NotFoundException('Document template not found');

    const ctx = await this.resolveStudentContext(data.tenantId, data.studentId);
    const student = ctx.student;
    const tenant = await this.templatesRepo.manager
      .getRepository(Tenant)
      .findOne({ where: { id: data.tenantId } });
    const tenantName = tenant?.name ?? 'School';

    const verificationCode = this.generateVerificationCode();
    const qrPayload = `SCH-${data.tenantId.substring(0, 8)}-${verificationCode}`;
    const date = new Date().toLocaleDateString('en-PH', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    const vars: Record<string, string> = {
      studentName: `${student.lastName}, ${student.firstName}`.trim(),
      firstName: student.firstName,
      lastName: student.lastName,
      lrn: student.lrn ?? '',
      gradeLevel: ctx.gradeLevel ?? '',
      schoolYear: ctx.schoolYear ?? '',
      date,
      verificationCode,
    };

    // Tenant branding (platform-admin editable): colors, logo, display name,
    // tagline, footer text. All optional — an unbranded tenant keeps the
    // legacy plain layout.
    const branding: PdfBranding | undefined = tenant?.branding
      ? {
          primaryColor: tenant.branding.primaryColor,
          secondaryColor: tenant.branding.secondaryColor,
          accentColor: tenant.branding.accentColor,
          schoolName: tenant.branding.schoolName,
          tagline: tenant.branding.tagline,
          footerText: tenant.branding.footerText,
          logoSource: tenant.branding.logo,
        }
      : undefined;

    let fileUrl: string;
    if (template.documentType === 'form_137' || template.documentType === 'tor') {
      const subjects = await this.collectSubjectRatings(data.tenantId, data.studentId);
      fileUrl = await this.pdf.renderRecordPdf({
        header: template.content?.header ?? template.name,
        student: {
          name: vars.studentName,
          lrn: student.lrn,
          schoolYear: ctx.schoolYear,
          gradeLevel: ctx.gradeLevel,
        },
        subjects,
        generalAverage: subjects.length
          ? subjects.reduce((s, r) => s + (r.finalRating ?? 0), 0) / subjects.length
          : null,
        footerLines: [
          `Issued ${date} • Verify at /documents/verify`,
          'This document is invalid if the verification code does not match.',
        ],
        tenantName,
        verificationCode,
        qrPayload,
        branding,
      });
    } else {
      const bodyLines = this.certificateBodyLines(template.documentType, vars, tenantName);
      fileUrl = await this.pdf.renderCertificatePdf({
        header: template.content?.header ?? template.name,
        subheaderLines: ctx.schoolYear ? [`School Year ${ctx.schoolYear}`] : [],
        bodyLines,
        footerLines: [
          `Issued ${date} • Verify at /documents/verify`,
          'This document is invalid if the verification code does not match.',
        ],
        tenantName,
        verificationCode,
        qrPayload,
        branding,
      });
    }

    const doc = this.generatedDocsRepo.create({
      ...data,
      verificationCode,
      qrPayload,
      fileUrl, // storage-relative path; served by the authenticated download route
    });
    return this.generatedDocsRepo.save(doc);
  }

  /** Latest-enrollment identity context used by every merge field. */
  private async resolveStudentContext(tenantId: string, studentId: string) {
    const student = await this.templatesRepo.manager.getRepository(Student).findOne({
      where: { id: studentId, tenantId },
    });
    if (!student) throw new NotFoundException('Student not found');

    const enrollment = await this.templatesRepo.manager.getRepository(Enrollment).findOne({
      where: { studentId, tenantId, status: 'enrolled' },
      order: { enrolledAt: 'DESC' },
    });

    let gradeLevel: string | null = null;
    let schoolYear: string | null = null;
    if (enrollment) {
      schoolYear =
        (
          await this.templatesRepo.manager.getRepository(SchoolYear).findOne({
            where: { id: enrollment.schoolYearId },
          })
        )?.name ?? null;
      const glId = enrollment.gradeLevelId;
      if (glId) {
        const gl = await this.templatesRepo.manager.getRepository(GradeLevel).findOne({ where: { id: glId } });
        gradeLevel = gl?.name ?? null;
        if (!gradeLevel) {
          // Seeded enrollments sometimes reference education-level ids here.
          gradeLevel =
            (
              await this.templatesRepo.manager.getRepository(EducationLevel).findOne({
                where: { id: glId },
              })
            )?.name ?? null;
        }
      }
    }

    return { student, gradeLevel, schoolYear };
  }

  /** Per-subject finalized rating (mean of transmuted grades). */
  private async collectSubjectRatings(
    tenantId: string,
    studentId: string,
  ): Promise<Array<{ code: string; title: string; finalRating: number | null }>> {
    const m = this.templatesRepo.manager;

    const entries = await m.getRepository(GradeEntry).find({
      where: { studentId, tenantId, isFinalized: true },
    });
    if (entries.length === 0) return [];

    const offeringIds = [...new Set(entries.map((e) => e.classOfferingId))];
    const offerings = await m.getRepository(ClassOffering).find({
      where: { id: In(offeringIds), tenantId },
    });
    const subjectIds = [...new Set(offerings.map((o) => o.subjectId))];
    const subjects = subjectIds.length
      ? await m.getRepository(Subject).find({ where: { id: In(subjectIds) } })
      : [];

    const offeringById = new Map(offerings.map((o) => [o.id, o]));
    const subjectById = new Map(subjects.map((s) => [s.id, s]));

    // offering → subject → collected transmuted grades
    const byOffering = new Map<string, number[]>();
    for (const e of entries) {
      if (e.transmutedGrade == null) continue;
      const list = byOffering.get(e.classOfferingId) ?? [];
      list.push(Number(e.transmutedGrade));
      byOffering.set(e.classOfferingId, list);
    }

    const bySubject = new Map<string, number[]>();
    for (const [offeringId, grades] of byOffering) {
      const subjectId = offeringById.get(offeringId)?.subjectId;
      if (!subjectId) continue;
      const list = bySubject.get(subjectId) ?? [];
      list.push(...grades);
      bySubject.set(subjectId, list);
    }

    return [...bySubject.entries()].map(([subjectId, grades]) => ({
      code: subjectById.get(subjectId)?.code ?? '—',
      title: subjectById.get(subjectId)?.title ?? 'Unknown subject',
      finalRating: grades.length
        ? grades.reduce((a, b) => a + b, 0) / grades.length
        : null,
    }));
  }

  /** Fallback certificate wording when the template carries no custom body. */
  private certificateBodyLines(
    documentType: string,
    vars: Record<string, string>,
    tenantName: string,
  ): string[] {
    const name = vars.studentName;
    const gl = vars.gradeLevel || 'their grade level';
    const sy = vars.schoolYear;
    const sySuffix = sy ? ` for School Year ${sy}` : '';

    switch (documentType) {
      case 'cert_enrollment':
        return [
          'This is to certify that',
          `[b]${name}[/b]`,
          `is officially enrolled in ${gl} at ${tenantName}${sySuffix}.`,
          '',
          `This certification is issued upon request for legal and academic purposes.`,
        ];
      case 'good_moral':
        return [
          'This is to certify that',
          `[b]${name}[/b]`,
          `has exhibited good moral character while studying at ${tenantName}${sySuffix}.`,
          '',
          'This certification is issued upon request and based on school records.',
        ];
      case 'diploma':
        return [
          'This is to certify that',
          `[b]${name}[/b]`,
          `has satisfactorily completed the requirements of ${gl} at ${tenantName}${sySuffix} and is hereby awarded this diploma.`,
        ];
      default:
        return [
          'This is to certify that',
          `[b]${name}[/b]`,
          `is a student of ${tenantName}${sySuffix}.`,
        ];
    }
  }

  async getGeneratedDocs(tenantId: string, studentId?: string) {
    const where: any = { tenantId };
    if (studentId) where.studentId = studentId;
    return this.generatedDocsRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  /** Single generated document lookup (used by the download route). */
  async getGeneratedDoc(id: string, tenantId: string): Promise<GeneratedDocument> {
    const doc = await this.generatedDocsRepo.findOne({ where: { id, tenantId } });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
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
