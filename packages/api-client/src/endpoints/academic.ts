import type { ApiClient } from '../client';
import type {
  EducationLevel, GradeLevel, SchoolYear, Term,
  Track, Strand, Program, Subject, Curriculum, CurriculumSubject
} from '../types';

export const academicEndpoints = (client: ApiClient) => ({
  // Education Levels
  listEducationLevels: () =>
    client.get<EducationLevel[]>('/api/v1/academic/education-levels'),

  createEducationLevel: (data: { code: string; name: string; sortOrder: number }) =>
    client.post<EducationLevel>('/api/v1/academic/education-levels', data),

  // Grade Levels
  listGradeLevels: (params?: { educationLevelId?: string }) =>
    client.get<GradeLevel[]>('/api/v1/academic/grade-levels', params as Record<string, string>),

  createGradeLevel: (data: { educationLevelId: string; code: string; name: string; sortOrder: number }) =>
    client.post<GradeLevel>('/api/v1/academic/grade-levels', data),

  // School Years
  listSchoolYears: () =>
    client.get<SchoolYear[]>('/api/v1/academic/school-years'),

  createSchoolYear: (data: { name: string; startDate: string; endDate: string }) =>
    client.post<SchoolYear>('/api/v1/academic/school-years', data),

  // Terms
  listTerms: (schoolYearId: string) =>
    client.get<Term[]>(`/api/v1/academic/school-years/${schoolYearId}/terms`),

  createTerm: (data: { schoolYearId: string; name: string; sequence: number; startDate: string; endDate: string; gradingDeadline?: string }) =>
    client.post<Term>('/api/v1/academic/terms', data),

  // Tracks
  listTracks: () =>
    client.get<Track[]>('/api/v1/academic/tracks'),

  createTrack: (data: { name: string }) =>
    client.post<Track>('/api/v1/academic/tracks', data),

  // Strands
  listStrands: (params?: { trackId?: string }) =>
    client.get<Strand[]>('/api/v1/academic/strands', params as Record<string, string>),

  createStrand: (data: { trackId: string; name: string; code: string }) =>
    client.post<Strand>('/api/v1/academic/strands', data),

  // Programs
  listPrograms: () =>
    client.get<Program[]>('/api/v1/academic/programs'),

  createProgram: (data: { code: string; name: string; level: string }) =>
    client.post<Program>('/api/v1/academic/programs', data),

  // Subjects
  listSubjects: () =>
    client.get<Subject[]>('/api/v1/academic/subjects'),

  createSubject: (data: { code: string; title: string; units: number; isCore?: boolean; isElective?: boolean; learningArea?: string }) =>
    client.post<Subject>('/api/v1/academic/subjects', data),

  // Curricula
  listCurricula: (params?: { schoolYearId?: string; educationLevelId?: string }) =>
    client.get<Curriculum[]>('/api/v1/academic/curricula', params as Record<string, string>),

  getCurriculum: (id: string) =>
    client.get<Curriculum>(`/api/v1/academic/curricula/${id}`),

  createCurriculum: (data: { educationLevelId: string; schoolYearId: string; gradeLevelId?: string; strandId?: string; programId?: string; branchId?: string }) =>
    client.post<Curriculum>('/api/v1/academic/curricula', data),

  cloneCurriculum: (id: string) =>
    client.post<Curriculum>(`/api/v1/academic/curricula/${id}/clone`),

  publishCurriculum: (id: string) =>
    client.post<Curriculum>(`/api/v1/academic/curricula/${id}/publish`),

  // Curriculum Subjects
  listCurriculumSubjects: (params?: { curriculumId?: string }) =>
    client.get<CurriculumSubject[]>('/api/v1/academic/curriculum-subjects', params as Record<string, string>),

  createCurriculumSubject: (data: { curriculumId: string; subjectId: string; termId?: string; prerequisiteSubjectId?: string }) =>
    client.post<CurriculumSubject>('/api/v1/academic/curriculum-subjects', data),
});
