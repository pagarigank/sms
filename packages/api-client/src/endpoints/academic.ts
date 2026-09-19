import type { ApiClient } from '../client';
import type {
  EducationLevel, GradeLevel, SchoolYear, Term,
  Track, Strand, Program, Subject, Curriculum, CurriculumSubject
} from '../types';

export const academicEndpoints = (client: ApiClient) => ({
  // Education Levels
  listEducationLevels: (params?: { limit?: number }) =>
    client.get<EducationLevel[]>('/api/v1/academic/education-levels', params as Record<string, string | number | boolean>),

  createEducationLevel: (data: { code: string; name: string; sortOrder: number }) =>
    client.post<EducationLevel>('/api/v1/academic/education-levels', data),

  updateEducationLevel: (id: string, data: Partial<EducationLevel>) =>
    client.patch<EducationLevel>(`/api/v1/academic/education-levels/${id}`, data),

  deleteEducationLevel: (id: string) =>
    client.delete<EducationLevel>(`/api/v1/academic/education-levels/${id}`),

  // Grade Levels
  listGradeLevels: (params?: { educationLevelId?: string; limit?: number; search?: string }) =>
    client.get<GradeLevel[]>('/api/v1/academic/grade-levels', params as Record<string, string>),

  createGradeLevel: (data: { educationLevelId: string; code: string; name: string; sortOrder: number }) =>
    client.post<GradeLevel>('/api/v1/academic/grade-levels', data),

  updateGradeLevel: (id: string, data: Partial<GradeLevel>) =>
    client.patch<GradeLevel>(`/api/v1/academic/grade-levels/${id}`, data),

  deleteGradeLevel: (id: string) =>
    client.delete<GradeLevel>(`/api/v1/academic/grade-levels/${id}`),

  // School Years
  listSchoolYears: (params?: { branchId?: string; limit?: number; search?: string; status?: string }) =>
    client.get<SchoolYear[]>('/api/v1/academic/school-years', params as Record<string, string>),

  createSchoolYear: (data: { name: string; startDate: string; endDate: string }) =>
    client.post<SchoolYear>('/api/v1/academic/school-years', data),

  updateSchoolYear: (id: string, data: Partial<SchoolYear>) =>
    client.patch<SchoolYear>(`/api/v1/academic/school-years/${id}`, data),

  deleteSchoolYear: (id: string) =>
    client.delete<SchoolYear>(`/api/v1/academic/school-years/${id}`),

  activateSchoolYear: (id: string) =>
    client.post<SchoolYear>(`/api/v1/academic/school-years/${id}/activate`),

  // Academic rollover: preview what would be cloned, then roll over
  rolloverPreview: (id: string) =>
    client.get<{ terms: number; curricula: number; gradingSystems: number; honorRollConfigs: number }>(
      `/api/v1/academic/school-years/${id}/rollover-preview`,
    ),

  rollover: (
    id: string,
    data: { name: string; startDate: string; endDate: string; createdBy?: string },
  ) =>
    client.post<{
      schoolYear: SchoolYear;
      termsCreated: number;
      curriculaCloned: number;
      gradingSystemsCloned: number;
      honorRollConfigsCloned: number;
    }>(`/api/v1/academic/school-years/${id}/rollover`, data),

  // Terms
  listTerms: (schoolYearId: string) =>
    client.get<Term[]>(`/api/v1/academic/school-years/${schoolYearId}/terms`),

  createTerm: (data: { schoolYearId: string; name: string; sequence: number; startDate: string; endDate: string; gradingDeadline?: string }) =>
    client.post<Term>('/api/v1/academic/terms', data),

  updateTerm: (id: string, data: Partial<Term>) =>
    client.patch<Term>(`/api/v1/academic/terms/${id}`, data),

  deleteTerm: (id: string) =>
    client.delete<Term>(`/api/v1/academic/terms/${id}`),

  // Tracks
  listTracks: (params?: { limit?: number; search?: string }) =>
    client.get<Track[]>('/api/v1/academic/tracks', params as Record<string, string>),

  createTrack: (data: { name: string }) =>
    client.post<Track>('/api/v1/academic/tracks', data),

  updateTrack: (id: string, data: Partial<Track>) =>
    client.patch<Track>(`/api/v1/academic/tracks/${id}`, data),

  deleteTrack: (id: string) =>
    client.delete<Track>(`/api/v1/academic/tracks/${id}`),

  // Strands
  listStrands: (params?: { trackId?: string; limit?: number; search?: string }) =>
    client.get<Strand[]>('/api/v1/academic/strands', params as Record<string, string>),

  createStrand: (data: { trackId: string; name: string; code: string }) =>
    client.post<Strand>('/api/v1/academic/strands', data),

  updateStrand: (id: string, data: Partial<Strand>) =>
    client.patch<Strand>(`/api/v1/academic/strands/${id}`, data),

  deleteStrand: (id: string) =>
    client.delete<Strand>(`/api/v1/academic/strands/${id}`),

  // Programs
  listPrograms: (params?: { limit?: number; search?: string; level?: string }) =>
    client.get<Program[]>('/api/v1/academic/programs', params as Record<string, string>),

  createProgram: (data: { code: string; name: string; level: string }) =>
    client.post<Program>('/api/v1/academic/programs', data),

  updateProgram: (id: string, data: Partial<Program>) =>
    client.patch<Program>(`/api/v1/academic/programs/${id}`, data),

  deleteProgram: (id: string) =>
    client.delete<Program>(`/api/v1/academic/programs/${id}`),

  // Subjects
  listSubjects: (params?: { limit?: number; search?: string; isCore?: boolean }) =>
    client.get<Subject[]>('/api/v1/academic/subjects', params as Record<string, string>),

  createSubject: (data: { code: string; title: string; units: number; isCore?: boolean; isElective?: boolean; learningArea?: string; hoursPerWeek?: number; pricePerUnit?: number; feeTypeId?: string | null }) =>
    client.post<Subject>('/api/v1/academic/subjects', data),

  updateSubject: (id: string, data: Partial<Subject>) =>
    client.patch<Subject>(`/api/v1/academic/subjects/${id}`, data),

  deleteSubject: (id: string) =>
    client.delete<Subject>(`/api/v1/academic/subjects/${id}`),

  // Curricula
  listCurricula: (params?: { schoolYearId?: string; educationLevelId?: string; branchId?: string; limit?: number; search?: string }) =>
    client.get<Curriculum[]>('/api/v1/academic/curricula', params as Record<string, string>),

  getCurriculum: (id: string) =>
    client.get<Curriculum>(`/api/v1/academic/curricula/${id}`),

  createCurriculum: (data: { educationLevelId: string; schoolYearId: string; gradeLevelId?: string; strandId?: string; programId?: string; branchId?: string }) =>
    client.post<Curriculum>('/api/v1/academic/curricula', data),

  updateCurriculum: (id: string, data: Partial<Curriculum>) =>
    client.patch<Curriculum>(`/api/v1/academic/curricula/${id}`, data),

  cloneCurriculum: (id: string) =>
    client.post<Curriculum>(`/api/v1/academic/curricula/${id}/clone`),

  publishCurriculum: (id: string) =>
    client.post<Curriculum>(`/api/v1/academic/curricula/${id}/publish`),

  deleteCurriculum: (id: string) =>
    client.delete<Curriculum>(`/api/v1/academic/curricula/${id}`),

  // Curriculum Subjects
  // Backend route is nested: GET /academic/curricula/:curriculumId/subjects
  listCurriculumSubjects: (curriculumId: string) =>
    client.get<CurriculumSubject[]>(`/api/v1/academic/curricula/${curriculumId}/subjects`),

  createCurriculumSubject: (data: { curriculumId: string; subjectId: string; termId?: string; yearLevelId?: string; prerequisiteSubjectId?: string }) =>
    client.post<CurriculumSubject>('/api/v1/academic/curriculum-subjects', data),

  deleteCurriculumSubject: (id: string) =>
    client.delete<void>(`/api/v1/academic/curriculum-subjects/${id}`),
});
