import type { ApiClient } from '../client';

/** Section row as returned by the list endpoint, plus the roster seat count. */
export interface SectionWithSeatCount {
  id: string;
  tenantId: string;
  branchId?: string;
  schoolYearId?: string;
  name: string;
  gradeLevelId?: string;
  homeroom?: string;
  capacity: number;
  isActive: boolean;
  seatCount: number;
}

/** Active section-assignment row joined with the student profile. */
export interface SectionAssignment {
  id: string;
  tenantId: string;
  enrollmentId: string;
  sectionId: string;
  studentId: string;
  isActive: boolean;
  assignedAt: string;
  assignedBy?: string;
  student?: {
    id: string;
    firstName: string;
    lastName: string;
    studentNumber?: string;
  };
}

export function sisEndpoints(client: ApiClient) {
  return {
    // Students
    // Guardian portal: children of the authenticated guardian user
    // (JWT-derived server-side; no tenantId param needed).
    listMyChildren: () =>
      client.get('/api/v1/sis/students/my-children'),

    listStudents: (params: { tenantId: string; branchId?: string; search?: string; page?: number; limit?: number }) =>
      client.get('/api/v1/sis/students', params as any),

    getStudent: (id: string) =>
      client.get(`/api/v1/sis/students/${id}`),

    getStudent360: (id: string) =>
      client.get(`/api/v1/sis/students/${id}/profile`),

    createStudent: (data: any) =>
      client.post('/api/v1/sis/students', data),

    updateStudent: (id: string, data: any) =>
      client.put(`/api/v1/sis/students/${id}`, data),

    findDuplicates: (tenantId: string) =>
      client.get('/api/v1/sis/students/duplicates', { tenantId }),

    // Guardians
    listGuardians: (params: { tenantId: string }) =>
      client.get('/api/v1/sis/guardians', params as any),

    createGuardian: (data: any) =>
      client.post('/api/v1/sis/guardians', data),

    linkGuardian: (studentId: string, guardianId: string, data: any) =>
      client.post(`/api/v1/sis/students/${studentId}/guardians/${guardianId}/link`, data),

    getStudentGuardians: (studentId: string) =>
      client.get(`/api/v1/sis/students/${studentId}/guardians`),

    // Enrollments
    listEnrollments: (params: { tenantId: string; schoolYearId?: string }) =>
      client.get('/api/v1/sis/enrollments', params as any),

    createEnrollment: (data: any) =>
      client.post('/api/v1/sis/enrollments', data),

    // Batch re-enrollment (preview + execute against a draft target year)
    getReEnrollmentPreview: (sourceSchoolYearId: string) =>
      client.get<any>('/api/v1/sis/enrollments/batch/preview', { sourceSchoolYearId }),

    executeBatchReEnrollment: (data: {
      sourceSchoolYearId: string;
      targetSchoolYearId: string;
      targetCurriculumId: string;
      gradeLevelMappings: Array<{ sourceGradeLevelId: string; targetGradeLevelId: string }>;
      includeHolds?: boolean;
      includeOutstandingBalances?: boolean;
    }) => client.post<any>('/api/v1/sis/enrollments/batch', data),

    updateEnrollment: (id: string, data: any) =>
      client.put(`/api/v1/sis/enrollments/${id}`, data),

    // Sections — rows carry seatCount (active assignments) for inline meters
    listSections: (params: { tenantId: string; branchId?: string; schoolYearId?: string }) =>
      client.get<SectionWithSeatCount[]>('/api/v1/sis/sections', params as any),

    createSection: (data: any) =>
      client.post('/api/v1/sis/sections', data),

    updateSection: (id: string, data: any) =>
      client.put(`/api/v1/sis/sections/${id}`, data),

    deleteSection: (id: string) =>
      client.delete(`/api/v1/sis/sections/${id}`),

    // Section roster: active assignments joined with student profiles.
    listSectionStudents: (sectionId: string) =>
      client.get<SectionAssignment[]>(`/api/v1/sis/sections/${sectionId}/students`),

    assignStudentToSectionByStudent: (studentId: string, sectionId: string) =>
      client.post(`/api/v1/sis/sections/${sectionId}/students/${studentId}`),

    unassignSectionStudent: (sectionId: string, studentId: string) =>
      client.delete(`/api/v1/sis/sections/${sectionId}/students/${studentId}`),

    assignToSection: (enrollmentId: string, sectionId: string) =>
      client.post(`/api/v1/sis/enrollments/${enrollmentId}/assign-section/${sectionId}`),

    // Holds
    getStudentHolds: (studentId: string) =>
      client.get(`/api/v1/sis/students/${studentId}/holds`),

    createHold: (data: any) =>
      client.post('/api/v1/sis/holds', data),

    releaseHold: (id: string) =>
      client.put(`/api/v1/sis/holds/${id}/release`),

    // Documents
    getStudentDocuments: (studentId: string) =>
      client.get(`/api/v1/sis/students/${studentId}/documents`),

    createDocument: (data: any) =>
      client.post('/api/v1/sis/documents', data),

    // Behavior Incidents
    listIncidents: (params: { tenantId: string; studentId?: string }) =>
      client.get('/api/v1/sis/incidents', params as any),

    createIncident: (data: any) =>
      client.post('/api/v1/sis/incidents', data),

    // Health Records
    getStudentHealth: (studentId: string) =>
      client.get(`/api/v1/sis/students/${studentId}/health`),

    createHealthRecord: (data: any) =>
      client.post('/api/v1/sis/health', data),

    // Transfers
    getStudentTransfers: (studentId: string) =>
      client.get(`/api/v1/sis/students/${studentId}/transfers`),

    createTransfer: (data: any) =>
      client.post('/api/v1/sis/transfers', data),

    // Promotions
    getPromotions: (params: { tenantId: string; schoolYearId: string }) =>
      client.get('/api/v1/sis/promotions', params as any),

    createPromotion: (data: any) =>
      client.post('/api/v1/sis/promotions', data),

    // Merge Audit
    createMergeAudit: (data: any) =>
      client.post('/api/v1/sis/merge-audit', data),

    // === Extended Health Modules ===
    addImmunization: (studentId: string, data: any) => client.post(`/api/v1/sis/students/${studentId}/immunizations`, data),
    updateImmunization: (studentId: string, id: string, data: any) => client.put(`/api/v1/sis/students/${studentId}/immunizations/${id}`, data),
    deleteImmunization: (studentId: string, id: string) => client.delete(`/api/v1/sis/students/${studentId}/immunizations/${id}`),

    addMedication: (studentId: string, data: any) => client.post(`/api/v1/sis/students/${studentId}/medications`, data),
    updateMedication: (studentId: string, id: string, data: any) => client.put(`/api/v1/sis/students/${studentId}/medications/${id}`, data),
    deleteMedication: (studentId: string, id: string) => client.delete(`/api/v1/sis/students/${studentId}/medications/${id}`),

    addCarePlan: (studentId: string, data: any) => client.post(`/api/v1/sis/students/${studentId}/care-plans`, data),
    updateCarePlan: (studentId: string, id: string, data: any) => client.put(`/api/v1/sis/students/${studentId}/care-plans/${id}`, data),
    deleteCarePlan: (studentId: string, id: string) => client.delete(`/api/v1/sis/students/${studentId}/care-plans/${id}`),

    addAllergy: (studentId: string, data: any) => client.post(`/api/v1/sis/students/${studentId}/allergies`, data),
    updateAllergy: (studentId: string, id: string, data: any) => client.put(`/api/v1/sis/students/${studentId}/allergies/${id}`, data),
    deleteAllergy: (studentId: string, id: string) => client.delete(`/api/v1/sis/students/${studentId}/allergies/${id}`),
    
    // === Special Education & Screenings ===
    addScreening: (studentId: string, data: any) => client.post(`/api/v1/sis/students/${studentId}/screenings`, data),
    updateScreening: (studentId: string, id: string, data: any) => client.put(`/api/v1/sis/students/${studentId}/screenings/${id}`, data),
    deleteScreening: (studentId: string, id: string) => client.delete(`/api/v1/sis/students/${studentId}/screenings/${id}`),

    addIEP: (studentId: string, data: any) => client.post(`/api/v1/sis/students/${studentId}/ieps`, data),
    updateIEP: (studentId: string, id: string, data: any) => client.put(`/api/v1/sis/students/${studentId}/ieps/${id}`, data),
    deleteIEP: (studentId: string, id: string) => client.delete(`/api/v1/sis/students/${studentId}/ieps/${id}`),

    add504Plan: (studentId: string, data: any) => client.post(`/api/v1/sis/students/${studentId}/504-plans`, data),
    update504Plan: (studentId: string, id: string, data: any) => client.put(`/api/v1/sis/students/${studentId}/504-plans/${id}`, data),
    delete504Plan: (studentId: string, id: string) => client.delete(`/api/v1/sis/students/${studentId}/504-plans/${id}`),

    addEvaluation: (studentId: string, data: any) => client.post(`/api/v1/sis/students/${studentId}/evaluations`, data),
    updateEvaluation: (studentId: string, id: string, data: any) => client.put(`/api/v1/sis/students/${studentId}/evaluations/${id}`, data),
    deleteEvaluation: (studentId: string, id: string) => client.delete(`/api/v1/sis/students/${studentId}/evaluations/${id}`),

    addAccommodation: (studentId: string, data: any) => client.post(`/api/v1/sis/students/${studentId}/accommodations`, data),
    updateAccommodation: (studentId: string, id: string, data: any) => client.put(`/api/v1/sis/students/${studentId}/accommodations/${id}`, data),
    deleteAccommodation: (studentId: string, id: string) => client.delete(`/api/v1/sis/students/${studentId}/accommodations/${id}`),

    // === MTSS/Behavioral & Learning CRUD ===
    addDisciplineIncident: (studentId: string, data: any) => client.post(`/api/v1/sis/students/${studentId}/discipline-incidents`, data),
    updateDisciplineIncident: (studentId: string, id: string, data: any) => client.put(`/api/v1/sis/students/${studentId}/discipline-incidents/${id}`, data),
    deleteDisciplineIncident: (studentId: string, id: string) => client.delete(`/api/v1/sis/students/${studentId}/discipline-incidents/${id}`),

    addIntervention: (studentId: string, data: any) => client.post(`/api/v1/sis/students/${studentId}/interventions`, data),
    updateIntervention: (studentId: string, id: string, data: any) => client.put(`/api/v1/sis/students/${studentId}/interventions/${id}`, data),
    deleteIntervention: (studentId: string, id: string) => client.delete(`/api/v1/sis/students/${studentId}/interventions/${id}`),

    addSELAssessment: (studentId: string, data: any) => client.post(`/api/v1/sis/students/${studentId}/sel-assessments`, data),
    updateSELAssessment: (studentId: string, id: string, data: any) => client.put(`/api/v1/sis/students/${studentId}/sel-assessments/${id}`, data),
    deleteSELAssessment: (studentId: string, id: string) => client.delete(`/api/v1/sis/students/${studentId}/sel-assessments/${id}`),

    addLearningProfile: (studentId: string, data: any) => client.post(`/api/v1/sis/students/${studentId}/learning-profiles`, data),
    updateLearningProfile: (studentId: string, id: string, data: any) => client.put(`/api/v1/sis/students/${studentId}/learning-profiles/${id}`, data),
    deleteLearningProfile: (studentId: string, id: string) => client.delete(`/api/v1/sis/students/${studentId}/learning-profiles/${id}`),

    addGoal: (studentId: string, data: any) => client.post(`/api/v1/sis/students/${studentId}/goals`, data),
    updateGoal: (studentId: string, id: string, data: any) => client.put(`/api/v1/sis/students/${studentId}/goals/${id}`, data),
    deleteGoal: (studentId: string, id: string) => client.delete(`/api/v1/sis/students/${studentId}/goals/${id}`)
  };
}
