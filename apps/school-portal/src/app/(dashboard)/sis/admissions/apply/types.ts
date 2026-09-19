export interface EducationFormData {
  // Core personal info
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  birthDate: string;
  sex: string;
  address: string;
  phone: string;
  email: string;
  // Academic
  priorSchool: string;
  lrn: string;
  educationLevelId: string;
  gradeLevelId: string;
  // Guardian
  guardianFirstName: string;
  guardianLastName: string;
  guardianPhone: string;
  guardianEmail: string;
  guardianRelationship: string;
  // Extended student information
  govIdType?: string;
  govIdNumber?: string;
  healthFlags?: string;
  iepNotes?: string;
}
