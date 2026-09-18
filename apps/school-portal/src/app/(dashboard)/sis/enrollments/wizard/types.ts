export interface EnrollmentFormData {
  studentId: string;
  schoolYearId: string;
  curriculumId: string;
  sectionId: string;
  notes: string;
  subjectIds: string[];
  targetYearLevelId: string;
  targetTermId: string;
  isNewStudent: boolean;
  newStudentFirstName: string;
  newStudentLastName: string;
  newStudentEmail: string;
  newStudentPhone: string;
  newStudentGender: string;
  newStudentBirthDate: string;
  newStudentLrn: string;
  paymentPlanId: string;
  customInstallmentsCount: number;
}

export type EnrollmentFormDataPatch = Partial<EnrollmentFormData> & {
  studentSearch?: string;
};
