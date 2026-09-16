import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassOffering } from './class-offering.entity';
import { SchoolCalendar } from './school-calendar.entity';
import { CalendarEvent } from './calendar-event.entity';
import { StudentSchedule } from './student-schedule.entity';
import { FacultyLoadLimit } from './faculty-load-limit.entity';
import { Subject } from '../academic/subject.entity';
import { Room } from '../facility/room.entity';
import { Employee } from '../hr/employee.entity';

export interface StudentScheduleEntry {
  id: string;
  classOfferingId: string;
  sectionId: string | null;
  subjectId: string;
  subjectCode: string | null;
  subjectTitle: string | null;
  roomId: string | null;
  roomName: string | null;
  teacherName: string | null;
  day: string | null;
  startTime: string | null;
  endTime: string | null;
}

@Injectable()
export class SchedulingService {
  constructor(
    @InjectRepository(ClassOffering) private offeringsRepo: Repository<ClassOffering>,
    @InjectRepository(SchoolCalendar) private calendarsRepo: Repository<SchoolCalendar>,
    @InjectRepository(CalendarEvent) private eventsRepo: Repository<CalendarEvent>,
    @InjectRepository(StudentSchedule) private schedulesRepo: Repository<StudentSchedule>,
    @InjectRepository(FacultyLoadLimit) private loadLimitsRepo: Repository<FacultyLoadLimit>,
    @InjectRepository(Subject) private subjectsRepo: Repository<Subject>,
    @InjectRepository(Room) private roomsRepo: Repository<Room>,
    @InjectRepository(Employee) private employeesRepo: Repository<Employee>,
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
  async getStudentSchedule(studentId: string, tenantId: string): Promise<StudentScheduleEntry[]> {
    const schedules = await this.schedulesRepo.find({
      where: { studentId, tenantId, isActive: true },
      order: { createdAt: 'ASC' },
    });

    // Resolve display names for the grid — guardians should not have to
    // decode uuids. Lookups are batched and missing references (subject
    // deleted, room unassigned, offering without a teacher) degrade to null.
    const subjectIds = [...new Set(schedules.map((s) => s.subjectId).filter(Boolean))];
    const roomIds = [...new Set(schedules.map((s) => s.roomId).filter(Boolean))] as string[];
    const offeringIds = [...new Set(schedules.map((s) => s.classOfferingId).filter(Boolean))];

    const [subjects, rooms, offerings] = await Promise.all([
      subjectIds.length
        ? this.subjectsRepo.find({ where: subjectIds.map((id) => ({ id, tenantId })) })
        : Promise.resolve([] as Subject[]),
      roomIds.length
        ? this.roomsRepo.find({ where: roomIds.map((id) => ({ id, tenantId })) })
        : Promise.resolve([] as Room[]),
      offeringIds.length
        ? this.offeringsRepo.find({ where: offeringIds.map((id) => ({ id, tenantId })) })
        : Promise.resolve([] as ClassOffering[]),
    ]);

    const subjectById = new Map(subjects.map((s) => [s.id, s]));
    const roomById = new Map(rooms.map((r) => [r.id, r]));
    const offeringById = new Map(offerings.map((o) => [o.id, o]));

    // Teachers come from the offerings' facultyEmployeeId — one batched
    // employee lookup.
    const employeeIds = [
      ...new Set(
        offerings
          .map((o) => o.facultyEmployeeId)
          .filter((v): v is string => !!v),
      ),
    ];
    const employees = employeeIds.length
      ? await this.employeesRepo.find({ where: employeeIds.map((id) => ({ id, tenantId })) })
      : ([] as Employee[]);
    const employeeById = new Map(employees.map((e) => [e.id, e]));

    return schedules.map((s) => {
      const subject = subjectById.get(s.subjectId);
      const room = s.roomId ? roomById.get(s.roomId) : undefined;
      const offering = offeringById.get(s.classOfferingId);
      const teacher = offering?.facultyEmployeeId
        ? employeeById.get(offering.facultyEmployeeId)
        : undefined;
      return {
        id: s.id,
        classOfferingId: s.classOfferingId,
        sectionId: s.sectionId ?? null,
        subjectId: s.subjectId,
        subjectCode: subject?.code ?? null,
        subjectTitle: subject?.title ?? null,
        roomId: s.roomId ?? null,
        roomName: room?.name ?? null,
        teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}`.trim() : null,
        day: s.timeSlot?.day ?? null,
        startTime: s.timeSlot?.startTime ?? null,
        endTime: s.timeSlot?.endTime ?? null,
      };
    });
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
