export interface ApiClientConfig {
  baseUrl: string;
  getToken?: () => string | null;
  onUnauthorized?: () => void;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Entity types matching backend
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  branding?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  address?: string;
  tin?: string;
  birBranchCode?: string;
  levelsOffered: string[];
  status: string;
  createdAt: string;
}

export interface Department {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  educationLevelIds: string[];
  isDefault: boolean;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  status: string;
  createdAt: string;
}

export interface Role {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
  description?: string;
}

export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  tenantId: string;
  branchId?: string;
}

export interface Building {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  code?: string;
  floorCount?: number;
  address?: string;
  floors?: Floor[];
}

export interface Floor {
  id: string;
  tenantId: string;
  buildingId: string;
  label: string;
  floorNumber: number;
  rooms?: Room[];
}

export interface Room {
  id: string;
  tenantId: string;
  branchId: string;
  floorId: string;
  name: string;
  roomType: string;
  capacity?: number;
  seatingLayout?: string;
  status: string;
  equipmentTags?: string[];
  assets?: RoomAsset[];
}

export interface RoomAsset {
  id: string;
  tenantId: string;
  roomId: string;
  assetTag?: string;
  assetType: string;
  description?: string;
  condition?: string;
  maintenanceFlag: boolean;
}

export interface EducationLevel {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  sortOrder: number;
}

export interface GradeLevel {
  id: string;
  tenantId: string;
  educationLevelId: string;
  code: string;
  name: string;
  sortOrder: number;
}

export interface SchoolYear {
  id: string;
  tenantId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

export interface Term {
  id: string;
  tenantId: string;
  schoolYearId: string;
  name: string;
  sequence: number;
  startDate: string;
  endDate: string;
  gradingDeadline?: string;
}

export interface Track {
  id: string;
  tenantId: string;
  name: string;
}

export interface Strand {
  id: string;
  tenantId: string;
  trackId: string;
  name: string;
  code: string;
}

export interface Program {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  level: string;
}

export interface Subject {
  id: string;
  tenantId: string;
  code: string;
  title: string;
  units: number;
  hoursPerWeek?: number;
  isCore: boolean;
  isElective: boolean;
  learningArea?: string;
}

export interface Curriculum {
  id: string;
  tenantId: string;
  branchId?: string;
  educationLevelId: string;
  gradeLevelId?: string;
  strandId?: string;
  programId?: string;
  schoolYearId: string;
  status: string;
  versionLabel?: string;
  clonedFromCurriculumId?: string;
}

export interface CurriculumSubject {
  id: string;
  tenantId: string;
  curriculumId: string;
  subjectId: string;
  termId?: string;
  prerequisiteSubjectId?: string;
  effectiveGradingSystemId?: string;
}

export interface GradingSystem {
  id: string;
  tenantId: string;
  branchId?: string;
  educationLevelId: string;
  schoolYearId: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
  isActive: boolean;
}

export interface GradeComponent {
  id: string;
  tenantId: string;
  gradingSystemId: string;
  name: string;
  weight: number;
  order: number;
}

export interface HonorRollConfig {
  id: string;
  tenantId: string;
  branchId?: string;
  educationLevelId: string;
  schoolYearId: string;
  withHonorsThreshold: number;
  withHighHonorsThreshold: number;
  withHighestHonorsThreshold: number;
  isActive: boolean;
}

export interface LookupList {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  description?: string;
}

export interface LookupItem {
  id: string;
  tenantId: string;
  listId: string;
  value: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
}

export interface CustomFieldDefinition {
  id: string;
  tenantId: string;
  entityType: string;
  fieldName: string;
  fieldType: string;
  label: string;
  options?: Record<string, unknown>;
  isRequired: boolean;
  sortOrder: number;
}

export interface NumberingScheme {
  id: string;
  tenantId: string;
  name: string;
  entityType: string;
  format: string;
  currentSequence: number;
}

export interface FeatureFlag {
  id: string;
  tenantId: string;
  key: string;
  name: string;
  isEnabled: boolean;
  config?: Record<string, unknown>;
}

export interface AuditEvent {
  id: string;
  tenantId: string;
  actorUserId?: string;
  entityType: string;
  entityId: string;
  action: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  correlationId?: string;
  occurredAt: string;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tenantId?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}
