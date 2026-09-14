import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './employee.entity';
import { TeachingLoad } from './teaching-load.entity';
import { DtrRecord } from './dtr-record.entity';

@Injectable()
export class HrService {
  constructor(
    @InjectRepository(Employee) private employeesRepo: Repository<Employee>,
    @InjectRepository(TeachingLoad) private teachingLoadsRepo: Repository<TeachingLoad>,
    @InjectRepository(DtrRecord) private dtrRepo: Repository<DtrRecord>,
  ) {}

  // === Employees ===
  async getEmployees(tenantId: string, branchId?: string) {
    const where: any = { tenantId, isActive: true };
    if (branchId) where.branchId = branchId;
    return this.employeesRepo.find({ where, order: { lastName: 'ASC' } });
  }

  async getEmployee(id: string, tenantId: string) {
    const employee = await this.employeesRepo.findOne({ where: { id, tenantId } });
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async createEmployee(data: Partial<Employee>) {
    const employee = this.employeesRepo.create(data);
    return this.employeesRepo.save(employee);
  }

  async updateEmployee(id: string, tenantId: string, data: Partial<Employee>) {
    const employee = await this.employeesRepo.findOne({ where: { id, tenantId } });
    if (!employee) throw new NotFoundException('Employee not found');
    Object.assign(employee, data);
    return this.employeesRepo.save(employee);
  }

  async deactivateEmployee(id: string, tenantId: string) {
    const employee = await this.employeesRepo.findOne({ where: { id, tenantId } });
    if (!employee) throw new NotFoundException('Employee not found');
    employee.isActive = false;
    return this.employeesRepo.save(employee);
  }

  // === Teaching Loads ===
  async getTeachingLoads(tenantId: string, params: { employeeId?: string; termId?: string; schoolYearId?: string }) {
    const where: any = { tenantId };
    if (params.employeeId) where.employeeId = params.employeeId;
    if (params.termId) where.termId = params.termId;
    if (params.schoolYearId) where.schoolYearId = params.schoolYearId;
    return this.teachingLoadsRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async assignTeachingLoad(data: Partial<TeachingLoad>) {
    // Check for duplicate
    const existing = await this.teachingLoadsRepo.findOne({
      where: {
        tenantId: data.tenantId,
        employeeId: data.employeeId,
        classOfferingId: data.classOfferingId,
        termId: data.termId,
      },
    });
    if (existing) throw new BadRequestException('Teaching load already assigned');

    const load = this.teachingLoadsRepo.create(data);
    return this.teachingLoadsRepo.save(load);
  }

  async removeTeachingLoad(id: string, tenantId: string) {
    const load = await this.teachingLoadsRepo.findOne({ where: { id, tenantId } });
    if (!load) throw new NotFoundException('Teaching load not found');
    await this.teachingLoadsRepo.remove(load);
  }

  async getFacultySummary(tenantId: string, employeeId: string, termId: string) {
    const loads = await this.teachingLoadsRepo.find({
      where: { tenantId, employeeId, termId },
    });

    return {
      employeeId,
      termId,
      totalLoad: loads.length,
      loads: loads.map(l => ({
        classOfferingId: l.classOfferingId,
        isSubstitute: l.isSubstitute,
      })),
    };
  }

  // === DTR ===
  async getDtrRecords(tenantId: string, params: { employeeId?: string; startDate?: string; endDate?: string }) {
    const qb = this.dtrRepo.createQueryBuilder('dtr')
      .where('dtr.tenantId = :tenantId', { tenantId });

    if (params.employeeId) qb.andWhere('dtr.employeeId = :employeeId', { employeeId: params.employeeId });
    if (params.startDate) qb.andWhere('dtr.attendanceDate >= :startDate', { startDate: params.startDate });
    if (params.endDate) qb.andWhere('dtr.attendanceDate <= :endDate', { endDate: params.endDate });

    return qb.orderBy('dtr.attendanceDate', 'DESC').getMany();
  }

  async recordDtr(data: Partial<DtrRecord>) {
    // Upsert by employee + date
    const existing = await this.dtrRepo.findOne({
      where: {
        tenantId: data.tenantId,
        employeeId: data.employeeId,
        attendanceDate: data.attendanceDate,
      },
    });

    if (existing) {
      Object.assign(existing, data);
      return this.dtrRepo.save(existing);
    }

    const record = this.dtrRepo.create(data);
    return this.dtrRepo.save(record);
  }

  async getEmployeeDtrSummary(tenantId: string, employeeId: string, month: string) {
    const startDate = `${month}-01`;
    const endDate = `${month}-31`;

    const records = await this.dtrRepo.find({
      where: { tenantId, employeeId },
      order: { attendanceDate: 'ASC' },
    });

    const monthRecords = records.filter(r => {
      const date = r.attendanceDate as any;
      return date >= startDate && date <= endDate;
    });

    return {
      employeeId,
      month,
      totalDays: monthRecords.length,
      records: monthRecords,
    };
  }
}
