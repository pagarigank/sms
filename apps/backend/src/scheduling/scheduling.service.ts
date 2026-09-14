import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassOffering } from './class-offering.entity';
import { SchoolCalendar } from './school-calendar.entity';
import { CalendarEvent } from './calendar-event.entity';
import { StudentSchedule } from './student-schedule.entity';
import { FacultyLoadLimit } from './faculty-load-limit.entity';

@Injectable()
export class SchedulingService {
  constructor(
    @InjectRepository(ClassOffering) private offeringsRepo: Repository<ClassOffering>,
    @InjectRepository(SchoolCalendar) private calendarsRepo: Repository<SchoolCalendar>,
    @InjectRepository(CalendarEvent) private eventsRepo: Repository<CalendarEvent>,
    @InjectRepository(StudentSchedule) private schedulesRepo: Repository<StudentSchedule>,
    @InjectRepository(FacultyLoadLimit) private loadLimitsRepo: Repository<FacultyLoadLimit>,
  ) {}

  // === Class Offerings ===
  async findAllOfferings(tenantId: string, branchId?: string, schoolYearId?: string, termId?: string) {
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;
    if (schoolYearId) where.schoolYearId = schoolYearId;
    if (termId) where.termId = termId;
    return this.offeringsRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async createOffering(data: Partial<ClassOffering>) {
    // Check for conflicts
    const conflict = await this.checkSchedulingConflict(data);
    if (conflict) {
      throw new BadRequestException(`Scheduling conflict: ${conflict}`);
    }
    const offering = this.offeringsRepo.create(data);
    return this.offeringsRepo.save(offering);
  }

  async updateOffering(id: string, tenantId: string, data: Partial<ClassOffering>) {
    const offering = await this.offeringsRepo.findOne({ where: { id, tenantId } });
    if (!offering) throw new NotFoundException('Class offering not found');
    Object.assign(offering, data);
    return this.offeringsRepo.save(offering);
  }

  async checkSchedulingConflict(data: Partial<ClassOffering>): Promise<string | null> {
    if (!data.timeSlots || !data.termId) return null;

    // Check faculty conflict
    if (data.facultyEmployeeId) {
      const facultyOfferings = await this.offeringsRepo.find({
        where: { tenantId: data.tenantId, facultyEmployeeId: data.facultyEmployeeId, termId: data.termId, status: 'active' },
      });
      for (const existing of facultyOfferings) {
        if (existing.id === data.id) continue;
        for (const newSlot of data.timeSlots) {
          for (const existingSlot of (existing.timeSlots as any[] || [])) {
            if (newSlot.day === existingSlot.day) {
              if (this.timesOverlap(newSlot.startTime, newSlot.endTime, existingSlot.startTime, existingSlot.endTime)) {
                return `Faculty member is already assigned during ${newSlot.day} ${newSlot.startTime}-${newSlot.endTime}`;
              }
            }
          }
        }
      }
    }

    // Check room conflict
    if (data.roomId) {
      const roomOfferings = await this.offeringsRepo.find({
        where: { tenantId: data.tenantId, roomId: data.roomId, termId: data.termId, status: 'active' },
      });
      for (const existing of roomOfferings) {
        if (existing.id === data.id) continue;
        for (const newSlot of data.timeSlots) {
          for (const existingSlot of (existing.timeSlots as any[] || [])) {
            if (newSlot.day === existingSlot.day) {
              if (this.timesOverlap(newSlot.startTime, newSlot.endTime, existingSlot.startTime, existingSlot.endTime)) {
                return `Room is already booked during ${newSlot.day} ${newSlot.startTime}-${newSlot.endTime}`;
              }
            }
          }
        }
      }
    }

    // Check section conflict
    if (data.sectionId) {
      const sectionOfferings = await this.offeringsRepo.find({
        where: { tenantId: data.tenantId, sectionId: data.sectionId, termId: data.termId, status: 'active' },
      });
      for (const existing of sectionOfferings) {
        if (existing.id === data.id) continue;
        for (const newSlot of data.timeSlots) {
          for (const existingSlot of (existing.timeSlots as any[] || [])) {
            if (newSlot.day === existingSlot.day) {
              if (this.timesOverlap(newSlot.startTime, newSlot.endTime, existingSlot.startTime, existingSlot.endTime)) {
                return `Section already has a class during ${newSlot.day} ${newSlot.startTime}-${newSlot.endTime}`;
              }
            }
          }
        }
      }
    }

    return null;
  }

  private timesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
    return start1 < end2 && start2 < end1;
  }

  // === Faculty Load ===
  async getFacultyLoad(tenantId: string, facultyEmployeeId: string, termId: string) {
    const offerings = await this.offeringsRepo.find({
      where: { tenantId, facultyEmployeeId, termId, status: 'active' },
    });

    const totalUnits = offerings.reduce((sum, o) => sum + Number(o.units), 0);
    const totalHours = offerings.reduce((sum, o) => sum + Number(o.hoursPerWeek), 0);

    // Get limits
    const limit = await this.loadLimitsRepo.findOne({
      where: { tenantId, employeeId: facultyEmployeeId, isActive: true },
    });

    return {
      offerings,
      totalUnits,
      totalHours,
      limit: limit || { maxUnits: 24, maxHoursPerWeek: 40 },
      isOverloaded: limit ? totalUnits > limit.maxUnits || totalHours > limit.maxHoursPerWeek : false,
    };
  }

  // === School Calendar ===
  async getCalendars(tenantId: string, branchId?: string) {
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;
    return this.calendarsRepo.find({ where });
  }

  async createCalendar(data: Partial<SchoolCalendar>) {
    const calendar = this.calendarsRepo.create(data);
    return this.calendarsRepo.save(calendar);
  }

  async getCalendarEvents(calendarId: string, tenantId: string) {
    return this.eventsRepo.find({ where: { calendarId, tenantId }, order: { startDate: 'ASC' } });
  }

  async createEvent(data: Partial<CalendarEvent>) {
    const event = this.eventsRepo.create(data);
    return this.eventsRepo.save(event);
  }

  // === Student Schedule ===
  async getStudentSchedule(studentId: string, tenantId: string) {
    return this.schedulesRepo.find({ where: { studentId, tenantId, isActive: true } });
  }

  // === Timetable ===
  async getTimetable(tenantId: string, sectionId: string, termId: string) {
    const offerings = await this.offeringsRepo.find({
      where: { tenantId, sectionId, termId, status: 'active' },
    });

    const timetable: Record<string, any[]> = {
      Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [],
    };

    for (const offering of offerings) {
      for (const slot of (offering.timeSlots as any[] || [])) {
        if (timetable[slot.day]) {
          timetable[slot.day].push({
            offeringId: offering.id,
            subjectId: offering.subjectId,
            facultyEmployeeId: offering.facultyEmployeeId,
            roomId: offering.roomId,
            startTime: slot.startTime,
            endTime: slot.endTime,
          });
        }
      }
    }

    return timetable;
  }
}
