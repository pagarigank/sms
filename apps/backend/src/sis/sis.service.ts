import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Student } from './student.entity';
import { Guardian } from './guardian.entity';
import { StudentGuardian } from './student-guardian.entity';
import { Enrollment } from './enrollment.entity';
import { Section } from './section.entity';
import { StudentSectionAssignment } from './student-section-assignment.entity';
import { EnrollmentHold } from './enrollment-hold.entity';
import { StudentDocument } from './student-document.entity';
import { StudentTransfer } from './student-transfer.entity';
import { PromotionDecision } from './promotion-decision.entity';
import { BehaviorIncident } from './behavior-incident.entity';
import { HealthRecord } from './health-record.entity';
import { StudentMergeAudit } from './student-merge-audit.entity';
import { InvoiceService } from '../billing/invoice.service';
import { Logger } from '@nestjs/common';

@Injectable()
export class SisService {
  private readonly logger = new Logger(SisService.name);

  constructor(
    private readonly invoiceService: InvoiceService,
    @InjectRepository(Student) private studentsRepo: Repository<Student>,
    @InjectRepository(Guardian) private guardiansRepo: Repository<Guardian>,
    @InjectRepository(StudentGuardian) private studentGuardiansRepo: Repository<StudentGuardian>,
    @InjectRepository(Enrollment) private enrollmentsRepo: Repository<Enrollment>,
    @InjectRepository(Section) private sectionsRepo: Repository<Section>,
    @InjectRepository(StudentSectionAssignment) private assignmentsRepo: Repository<StudentSectionAssignment>,
    @InjectRepository(EnrollmentHold) private holdsRepo: Repository<EnrollmentHold>,
    @InjectRepository(StudentDocument) private documentsRepo: Repository<StudentDocument>,
    @InjectRepository(StudentTransfer) private transfersRepo: Repository<StudentTransfer>,
    @InjectRepository(PromotionDecision) private promotionsRepo: Repository<PromotionDecision>,
    @InjectRepository(BehaviorIncident) private incidentsRepo: Repository<BehaviorIncident>,
    @InjectRepository(HealthRecord) private healthRepo: Repository<HealthRecord>,
    @InjectRepository(StudentMergeAudit) private mergeAuditRepo: Repository<StudentMergeAudit>,
    private dataSource: DataSource,
  ) {}

  // === Students ===
  async findAllStudents(tenantId: string, branchId?: string) {
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;
    return this.studentsRepo.find({ where, order: { lastName: 'ASC', firstName: 'ASC' } });
  }

  async findStudentById(id: string, tenantId: string) {
    const student = await this.studentsRepo.findOne({ where: { id, tenantId } });
    if (!student) throw new NotFoundException('Student not found');
    return student;
  }

  /**
   * Guardian portal: resolve the children of the logged-in guardian user.
   * Lookup chain: users.id → guardians.userId → student_guardians → students.
   * Throws Forbidden (not empty list) when the user has no guardian profile,
   * so the portal can distinguish "no children" from "not a guardian".
   */
  async findChildrenOfGuardianUser(userId: string, tenantId: string) {
    if (!userId) throw new ForbiddenException('Not authenticated as a guardian');
    const guardian = await this.guardiansRepo.findOne({ where: { userId, tenantId } });
    if (!guardian) throw new ForbiddenException('No guardian profile linked to this account');
    const links = await this.studentGuardiansRepo.find({ where: { guardianId: guardian.id, tenantId } });
    if (links.length === 0) return [];
    const studentIds = links.map((l) => l.studentId);
    return this.studentsRepo.find({ where: studentIds.map((id) => ({ id, tenantId })) });
  }

  async createStudent(data: Partial<Student>) {
    // Validate LRN format if provided
    if (data.lrn && !/^\d{12}$/.test(data.lrn)) {
      throw new BadRequestException('LRN must be exactly 12 digits');
    }
    const student = this.studentsRepo.create(data);
    return this.studentsRepo.save(student);
  }

  async updateStudent(id: string, tenantId: string, data: Partial<Student>) {
    const student = await this.findStudentById(id, tenantId);
    Object.assign(student, data);
    return this.studentsRepo.save(student);
  }

  async getStudent360(id: string, tenantId: string) {
    const student = await this.findStudentById(id, tenantId);
    const guardians = await this.studentGuardiansRepo.find({ where: { studentId: id } });
    const enrollments = await this.enrollmentsRepo.find({ where: { studentId: id }, order: { enrolledAt: 'DESC' } });
    const documents = await this.documentsRepo.find({ where: { studentId: id }, order: { createdAt: 'DESC' } });
    const holds = await this.holdsRepo.find({ where: { studentId: id, isActive: true } });
    const incidents = await this.incidentsRepo.find({ where: { studentId: id }, order: { incidentDate: 'DESC' } });
    const healthRecords = await this.healthRepo.find({ where: { studentId: id }, order: { recordDate: 'DESC' } });
    const transfers = await this.transfersRepo.find({ where: { studentId: id }, order: { createdAt: 'DESC' } });
    const promotions = await this.promotionsRepo.find({ where: { studentId: id }, order: { decidedAt: 'DESC' } });

    return {
      student,
      guardians,
      enrollments,
      documents,
      holds,
      incidents,
      healthRecords,
      transfers,
      promotions,
    };
  }

  // === Guardians ===
  async findAllGuardians(tenantId: string) {
    return this.guardiansRepo.find({ where: { tenantId }, order: { lastName: 'ASC' } });
  }

  async createGuardian(data: Partial<Guardian>) {
    const guardian = this.guardiansRepo.create(data);
    return this.guardiansRepo.save(guardian);
  }

  async linkGuardianToStudent(studentId: string, guardianId: string, tenantId: string, relationship: string, isPrimary: boolean) {
    const link = this.studentGuardiansRepo.create({ tenantId, studentId, guardianId, relationship, isPrimary });
    return this.studentGuardiansRepo.save(link);
  }

  async getStudentGuardians(studentId: string) {
    return this.studentGuardiansRepo.find({ where: { studentId } });
  }

  // === Enrollments ===
  async findAllEnrollments(tenantId: string, schoolYearId?: string) {
    const where: any = { tenantId };
    if (schoolYearId) where.schoolYearId = schoolYearId;
    return this.enrollmentsRepo.find({ where, order: { enrolledAt: 'DESC' } });
  }

  async createEnrollment(data: Partial<Enrollment>) {
    // Check for duplicate enrollment in same school year
    const existing = await this.enrollmentsRepo.findOne({
      where: { studentId: data.studentId, schoolYearId: data.schoolYearId, tenantId: data.tenantId },
    });
    if (existing) throw new BadRequestException('Student is already enrolled in this school year');

    const enrollment = this.enrollmentsRepo.create(data);
    const saved = await this.enrollmentsRepo.save(enrollment);

    // Auto-assess fees: generate the invoice from the resolved fee structure
    // (Phase 6 exit criterion). Non-fatal: enrollment must not be lost to a
    // billing configuration problem — the invoice can be generated manually.
    try {
      await this.invoiceService.generateInvoice({
        tenantId: saved.tenantId,
        branchId: saved.branchId,
        studentId: saved.studentId,
        enrollmentId: saved.id,
      });
    } catch (e) {
      this.logger.warn(
        `Auto-invoice failed for enrollment ${saved.id}: ${e instanceof Error ? e.message : e}`,
      );
    }

    return saved;
  }

  async updateEnrollment(id: string, tenantId: string, data: Partial<Enrollment>) {
    const enrollment = await this.enrollmentsRepo.findOne({ where: { id, tenantId } });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    Object.assign(enrollment, data);
    return this.enrollmentsRepo.save(enrollment);
  }

  // === Sections ===
  async findAllSections(tenantId: string, branchId?: string, schoolYearId?: string) {
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;
    if (schoolYearId) where.schoolYearId = schoolYearId;
    return this.sectionsRepo.find({ where, order: { name: 'ASC' } });
  }

  async createSection(data: Partial<Section>) {
    const section = this.sectionsRepo.create(data);
    return this.sectionsRepo.save(section);
  }

  async updateSection(id: string, tenantId: string, data: Partial<Section>) {
    const section = await this.sectionsRepo.findOne({ where: { id, tenantId } });
    if (!section) throw new NotFoundException('Section not found');
    Object.assign(section, data);
    return this.sectionsRepo.save(section);
  }

  async assignStudentToSection(enrollmentId: string, sectionId: string, tenantId: string, assignedBy?: string) {
    const enrollment = await this.enrollmentsRepo.findOne({ where: { id: enrollmentId, tenantId } });
    if (!enrollment) throw new NotFoundException('Enrollment not found');

    const section = await this.sectionsRepo.findOne({ where: { id: sectionId, tenantId } });
    if (!section) throw new NotFoundException('Section not found');

    // Enrollment update + assignment creation run in ONE transaction. The
    // capacity check inside uses a locking read of the section row so two
    // concurrent assignments cannot both pass the check and overfill the
    // section (check-then-insert without a lock is racy).
    return this.dataSource.transaction(async (manager) => {
      const assignmentsRepo = manager.getRepository(StudentSectionAssignment);

      // Lock the section row for the duration of the check + write.
      await manager.query(`SELECT id FROM sections WHERE id = $1 FOR UPDATE`, [sectionId]);

      const currentCount = await assignmentsRepo.count({ where: { sectionId, tenantId, isActive: true } });
      if (currentCount >= section.capacity) {
        throw new BadRequestException(`Section "${section.name}" is at full capacity (${section.capacity})`);
      }

      enrollment.sectionId = sectionId;
      await manager.save(enrollment);

      const assignment = assignmentsRepo.create({
        tenantId,
        enrollmentId,
        sectionId,
        studentId: enrollment.studentId,
        assignedBy,
      });
      return assignmentsRepo.save(assignment);
    });
  }

  // === Enrollment Holds ===
  async getStudentHolds(studentId: string, tenantId: string) {
    return this.holdsRepo.find({ where: { studentId, tenantId, isActive: true } });
  }

  async createHold(data: Partial<EnrollmentHold>) {
    const hold = this.holdsRepo.create(data);
    return this.holdsRepo.save(hold);
  }

  async releaseHold(id: string, tenantId: string, releasedBy: string) {
    const hold = await this.holdsRepo.findOne({ where: { id, tenantId } });
    if (!hold) throw new NotFoundException('Hold not found');
    hold.isActive = false;
    hold.releasedBy = releasedBy;
    hold.releasedAt = new Date();
    return this.holdsRepo.save(hold);
  }

  // === Documents ===
  async getStudentDocuments(studentId: string, tenantId: string) {
    return this.documentsRepo.find({ where: { studentId, tenantId }, order: { createdAt: 'DESC' } });
  }

  async createDocument(data: Partial<StudentDocument>) {
    const doc = this.documentsRepo.create(data);
    return this.documentsRepo.save(doc);
  }

  // === Transfers ===
  async createTransfer(data: Partial<StudentTransfer>) {
    const transfer = this.transfersRepo.create(data);
    return this.transfersRepo.save(transfer);
  }

  async getStudentTransfers(studentId: string, tenantId: string) {
    return this.transfersRepo.find({ where: { studentId, tenantId }, order: { createdAt: 'DESC' } });
  }

  // === Promotion Decisions ===
  async createPromotionDecision(data: Partial<PromotionDecision>) {
    const decision = this.promotionsRepo.create(data);
    return this.promotionsRepo.save(decision);
  }

  async getPromotionDecisions(tenantId: string, schoolYearId: string) {
    return this.promotionsRepo.find({ where: { tenantId, schoolYearId } });
  }

  // === Behavior Incidents ===
  async findAllIncidents(tenantId: string, studentId?: string) {
    const where: any = { tenantId };
    if (studentId) where.studentId = studentId;
    return this.incidentsRepo.find({ where, order: { incidentDate: 'DESC' } });
  }

  async createIncident(data: Partial<BehaviorIncident>) {
    const incident = this.incidentsRepo.create(data);
    return this.incidentsRepo.save(incident);
  }

  // === Health Records ===
  async getStudentHealthRecords(studentId: string, tenantId: string) {
    return this.healthRepo.find({ where: { studentId, tenantId }, order: { recordDate: 'DESC' } });
  }

  async createHealthRecord(data: Partial<HealthRecord>) {
    const record = this.healthRepo.create(data);
    return this.healthRepo.save(record);
  }

  // === Merge Audit ===
  async createMergeAudit(data: Partial<StudentMergeAudit>) {
    const audit = this.mergeAuditRepo.create(data);
    return this.mergeAuditRepo.save(audit);
  }

  // === Duplicate Detection ===
  async findDuplicateStudents(tenantId: string) {
    // Find students with same LRN or same name+birthdate
    const students = await this.studentsRepo.find({ where: { tenantId } });
    const duplicates: Student[][] = [];
    const lrnMap = new Map<string, Student[]>();
    const nameBirthMap = new Map<string, Student[]>();

    for (const s of students) {
      if (s.lrn) {
        const existing = lrnMap.get(s.lrn) || [];
        existing.push(s);
        lrnMap.set(s.lrn, existing);
      }
      const nameKey = `${s.firstName?.toLowerCase()}|${s.lastName?.toLowerCase()}|${s.birthDate}`;
      const existing = nameBirthMap.get(nameKey) || [];
      existing.push(s);
      nameBirthMap.set(nameKey, existing);
    }

    for (const group of lrnMap.values()) {
      if (group.length > 1) duplicates.push(group);
    }
    for (const group of nameBirthMap.values()) {
      if (group.length > 1) duplicates.push(group);
    }

    return duplicates;
  }
}
