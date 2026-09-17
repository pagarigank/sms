import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class SfFormsService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Generates data for SF1 (School Register).
   * Aggregates students assigned to a section.
   */
  async getSf1(tenantId: string, sectionId: string) {
    const section = await this.dataSource.query(
      `
      SELECT s.id, s.name, s."gradeLevelId", g.name as "gradeLevelName", 
             s."schoolYearId", sy.name as "schoolYearName"
      FROM sections s
      LEFT JOIN grade_levels g ON s."gradeLevelId" = g.id
      LEFT JOIN school_years sy ON s."schoolYearId" = sy.id
      WHERE s.id = $1 AND s."tenantId" = $2
      `,
      [sectionId, tenantId],
    );

    if (!section.length) {
      throw new NotFoundException('Section not found');
    }

    const students = await this.dataSource.query(
      `
      SELECT st.id, st.lrn, st."firstName", st."middleName", st."lastName", st.suffix,
             st.sex, st."birthDate", st.address, st."customFields"
      FROM student_section_assignments ssa
      JOIN students st ON ssa."studentId" = st.id
      WHERE ssa."sectionId" = $1 AND ssa."tenantId" = $2
      ORDER BY st.sex DESC, st."lastName" ASC, st."firstName" ASC
      `,
      [sectionId, tenantId],
    );

    // Group by Male/Female as required by DepEd forms
    const males = students.filter((s: any) => s.sex === 'Male' || s.sex === 'M');
    const females = students.filter((s: any) => s.sex === 'Female' || s.sex === 'F');

    return {
      section: section[0],
      students: {
        males,
        females,
        total: students.length,
      }
    };
  }

  /**
   * Generates data for SF2 (Daily Attendance).
   * Aggregates attendance records for a section for a specific month.
   */
  async getSf2(tenantId: string, sectionId: string, month: number, year: number) {
    // Basic implementation that fetches students and their attendance for the month
    const sectionData = await this.getSf1(tenantId, sectionId);
    
    // Fetch attendance from whatever attendance table exists.
    // If not exists, return empty array to be filled by frontend or future implementation.
    const attendance = await this.dataSource.query(
      `
      SELECT "studentId", date, status
      FROM attendance_records
      WHERE "sectionId" = $1 AND "tenantId" = $2
        AND EXTRACT(MONTH FROM date) = $3
        AND EXTRACT(YEAR FROM date) = $4
      `,
      [sectionId, tenantId, month, year],
    ).catch(() => []); // fallback if table doesn't exist yet

    return {
      section: sectionData.section,
      students: sectionData.students,
      attendance,
    };
  }

  /**
   * Generates data for SF9 (Report Card).
   * Aggregates grades for a student in a specific school year.
   */
  async getSf9(tenantId: string, studentId: string, schoolYearId: string) {
    const student = await this.dataSource.query(
      `SELECT * FROM students WHERE id = $1 AND "tenantId" = $2`,
      [studentId, tenantId]
    );

    if (!student.length) {
      throw new NotFoundException('Student not found');
    }

    const grades = await this.dataSource.query(
      `
      SELECT g.id, g.term, g.grade, g."createdAt",
             co.id as "classOfferingId", sub.name as "subjectName"
      FROM grade_entries g
      JOIN class_offerings co ON g."classOfferingId" = co.id
      JOIN subjects sub ON co."subjectId" = sub.id
      WHERE g."studentId" = $1 AND g."tenantId" = $2 AND co."schoolYearId" = $3
      `,
      [studentId, tenantId, schoolYearId]
    ).catch(() => []);

    return {
      student: student[0],
      grades,
    };
  }
}
