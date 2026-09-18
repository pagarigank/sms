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
    const sectionData = await this.getSf1(tenantId, sectionId);

    const attendance = await this.dataSource.query<Record<string, any>[]>(
      `
      SELECT "studentId", "attendanceDate", "status", "excuseReason", "periodNumber"
      FROM attendance_records
      WHERE "sectionId" = $1 AND "tenantId" = $2
        AND EXTRACT(MONTH FROM "attendanceDate") = $3
        AND EXTRACT(YEAR FROM "attendanceDate") = $4
      ORDER BY "studentId" ASC, "attendanceDate" ASC
      `,
      [sectionId, tenantId, month, year],
    );

    // Lookup map for the frontend grid: studentId -> dayOfMonth -> status.
    const attendanceByStudent: Record<string, Record<number, { status: string; excuseReason?: string | null; periodNumber?: number | null }>> = {};
    for (const row of attendance) {
      const day = new Date(`${row.attendanceDate}T00:00:00`).getDate();
      (attendanceByStudent[row.studentId] ??= {})[day] = {
        status: row.status,
        excuseReason: row.excuseReason,
        periodNumber: row.periodNumber,
      };
    }

    return {
      section: sectionData.section,
      students: sectionData.students,
      attendance,
      attendanceByStudent,
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

    // Aggregate grade entries into a per-subject-per-term report-card row.
    // grade_entries is per (class_offering, term, grade_component); the
    // report card needs one final grade per Learning Area per Quarter, so we
    // group by subject + term and average the server-computed transmuted grade.
    const gradeRows = await this.dataSource.query<Record<string, any>[]>(
      `
      SELECT g."term_id" AS "termId",
             co."subjectId" AS "subjectId",
             sub.title AS "subjectName",
             t.sequence AS "termSequence",
             t.name AS "termName",
             ROUND(AVG(g."transmuted_grade")::numeric, 2) AS "grade",
             string_agg(DISTINCT gc.name, ', ' ORDER BY gc.name) AS "components"
      FROM grade_entries g
      JOIN class_offerings co ON g."class_offering_id" = co.id
      JOIN subjects sub ON co."subjectId" = sub.id
      JOIN terms t ON g."term_id" = t.id AND t."tenantId" = $2
      JOIN grade_components gc ON g."grade_component_id" = gc.id
      WHERE g."student_id" = $1 AND g."tenant_id" = $2 AND co."schoolYearId" = $3
        AND g."transmuted_grade" IS NOT NULL
      GROUP BY g."term_id", co."subjectId", sub.title, t.sequence, t.name
      ORDER BY sub.title ASC, t.sequence ASC
      `,
      [studentId, tenantId, schoolYearId],
    );

    const grades = gradeRows.map((row: any) => ({
      id: `${row.subjectId}-${row.termSequence}`,
      subjectId: row.subjectId,
      subjectName: row.subjectName,
      term: row.termSequence,
      termName: row.termName,
      grade: row.grade == null ? null : Number(row.grade),
      components: row.components,
    }));

    return {
      student: student[0],
      grades,
    };
  }
}
