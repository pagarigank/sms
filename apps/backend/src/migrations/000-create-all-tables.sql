-- ============================================================
-- 000 — Entity-accurate schema baseline
-- ============================================================
-- GENERATED FILE — the DDL below is derived from the TypeORM @Entity
-- metadata, which is the source of truth for the application. Do not
-- hand-edit the generated block; regenerate instead:
--
--   cd apps/backend
--   node scripts/generate-schema-baseline.js \
--     --template scripts/schema-baseline.template.sql \
--     --out src/migrations/000-create-all-tables.sql
--
-- History: this file previously carried ~37 hand-written CREATE TABLE
-- statements using snake_case column names ("tenant_id", "created_at") while
-- every entity maps to camelCase ("tenantId", "createdAt"). It also omitted 68
-- of the 105 entity tables, so it could never build the schema the application
-- expects. The database everyone ran against had been materialised by TypeORM
-- `synchronize`, which is why the mismatch went unnoticed: every statement here
-- is `IF NOT EXISTS`, so on an existing database this file is a no-op.
--
-- Every statement is idempotent and safe to re-run on a populated database.
--
-- Row-level security is NOT defined here: 003-rls-policies.sql creates the
-- tenant_isolation_<table> policies for every tenant-scoped table, and
-- 012/013/014 add the platform-admin role gate. Creating them here as well
-- collided with those files (same policy names, no DROP POLICY IF EXISTS),
-- which is why 003 could not run.
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
-- pgcrypto: gen_random_uuid() (older migrations / functions)
-- uuid-ossp: uuid_generate_v4() (TypeORM's @PrimaryGeneratedColumn('uuid'))
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES, INDEXES AND CONSTRAINTS
-- ============================================================
-- Generated from every @Entity in apps/backend/src.
CREATE TABLE IF NOT EXISTS "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "email" character varying, "firstName" character varying, "lastName" character varying, "middleName" character varying, "phone" character varying, "passwordHash" character varying, "mfaSecret" character varying, "mfaEnabled" boolean NOT NULL DEFAULT false, "status" character varying NOT NULL DEFAULT 'active', "lastLoginAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "user_person_links" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "personType" character varying(20) NOT NULL, "personId" uuid NOT NULL, "tenantId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b50b0e765fa704fdc169f8af46f" PRIMARY KEY ("id"));

CREATE INDEX IF NOT EXISTS "IDX_f0fffdbd39b319628f839c0b29" ON "user_person_links" ("personType");

CREATE TABLE IF NOT EXISTS "user_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "userId" uuid NOT NULL, "sessionTokenHash" character varying NOT NULL, "ipAddress" character varying, "userAgent" character varying, "loginAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "lastActivityAt" TIMESTAMP WITH TIME ZONE, "logoutAt" TIMESTAMP WITH TIME ZONE, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "isForceTerminated" boolean NOT NULL DEFAULT false, "terminatedBy" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e93e031a5fed190d4789b6bfd83" PRIMARY KEY ("id"));

CREATE INDEX IF NOT EXISTS "IDX_bc83b28925d1e4d0003833cf92" ON "user_sessions" ("userId", "loginAt");

CREATE INDEX IF NOT EXISTS "IDX_dcc480258dd8d6e0eb3ef8981c" ON "user_sessions" ("tenantId");

CREATE TABLE IF NOT EXISTS "user_roles" ("userId" uuid NOT NULL, "tenantId" uuid NOT NULL, "roleId" uuid NOT NULL, "branchId" uuid, "grantedAt" TIMESTAMP NOT NULL DEFAULT now(), "grantedBy" uuid, CONSTRAINT "PK_46399e1fbf712c2738a4d9be693" PRIMARY KEY ("userId", "tenantId", "roleId"));

CREATE TABLE IF NOT EXISTS "role_permissions" ("roleId" uuid NOT NULL, "permissionId" uuid NOT NULL, CONSTRAINT "PK_d430a02aad006d8a70f3acd7d03" PRIMARY KEY ("roleId", "permissionId"));

CREATE TABLE IF NOT EXISTS "rebac_edges" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "subjectUserId" character varying NOT NULL, "relation" character varying NOT NULL, "objectType" character varying NOT NULL, "objectId" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "expiresAt" TIMESTAMP, CONSTRAINT "PK_469aa784f0e5bb97dbf90f7a22c" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "roles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "name" character varying NOT NULL, "description" character varying, "isSystem" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "permissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "resource" character varying NOT NULL, "action" character varying NOT NULL, "description" character varying, CONSTRAINT "PK_920331560282b8bd21bb02290df" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "student_transfers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "studentId" uuid NOT NULL, "fromBranchId" uuid NOT NULL, "toBranchId" uuid NOT NULL, "fromSchoolYearId" uuid, "toSchoolYearId" uuid, "fromGradeLevelId" uuid, "toGradeLevelId" uuid, "reason" character varying, "status" character varying NOT NULL DEFAULT 'pending', "requestedBy" character varying, "requestedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "approvedBy" character varying, "approvedAt" TIMESTAMP WITH TIME ZONE, "completedBy" character varying, "completedAt" TIMESTAMP WITH TIME ZONE, "metadata" jsonb NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a5c3b6c61199784501930784735" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "tenant_plans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "planKey" character varying NOT NULL, "name" character varying NOT NULL, "maxBranches" integer, "maxStudents" integer, "modules" jsonb NOT NULL DEFAULT '{}', "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_25ae63a541a412628dfe3e36207" UNIQUE ("planKey"), CONSTRAINT "PK_530d4b0e76244f85ae78915babf" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "student_section_assignments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "enrollmentId" uuid NOT NULL, "sectionId" uuid NOT NULL, "studentId" uuid NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "assignedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "assignedBy" character varying, "unassignedAt" TIMESTAMP, "unassignedBy" character varying, "unassignmentReason" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_fbc9c300e138c4ad82b83fb1b63" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "departments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "branchId" uuid NOT NULL, "name" character varying NOT NULL, "code" character varying NOT NULL, "educationLevelIds" uuid array NOT NULL DEFAULT '{}', "isDefault" boolean NOT NULL DEFAULT false, "contactEmail" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_839517a681a86bb84cbcc6a1e9d" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "branches" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "code" character varying NOT NULL, "address" character varying, "contactEmail" character varying, "contactPhone" character varying, "tin" character varying, "birBranchCode" character varying, "levelsOffered" text array NOT NULL DEFAULT '{}', "status" character varying NOT NULL DEFAULT 'active', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tenantId" uuid, CONSTRAINT "UQ_9c06cbb83feb2f0be6263bd47ee" UNIQUE ("code"), CONSTRAINT "PK_7f37d3b42defea97f1df0d19535" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "tenants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "slug" character varying NOT NULL, "planId" uuid NOT NULL, "status" character varying NOT NULL DEFAULT 'active', "branding" jsonb NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_2310ecc5cb8be427097154b18fc" UNIQUE ("slug"), CONSTRAINT "PK_53be67a04681c66b87ee27c9321" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "student_merge_audit" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "primaryStudentId" uuid NOT NULL, "mergedStudentId" uuid NOT NULL, "mergeReason" character varying, "mergedData" jsonb NOT NULL DEFAULT '{}', "mergedBy" character varying, "mergedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "isUndone" boolean NOT NULL DEFAULT false, "undoneBy" character varying, "undoneAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4a197e6f3cb151ed47ad7065e1a" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "student_documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "studentId" uuid NOT NULL, "documentType" character varying NOT NULL, "title" character varying, "description" character varying, "fileUrl" character varying NOT NULL, "fileName" character varying, "mimeType" character varying, "fileSize" integer, "isSystemGenerated" boolean NOT NULL DEFAULT false, "isVisibleToGuardian" boolean NOT NULL DEFAULT true, "verificationCode" character varying, "uploadedBy" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b5805e41001d410755048c8dfc4" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "student_guardians" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "studentId" uuid NOT NULL, "guardianId" uuid NOT NULL, "relationship" character varying, "isPrimary" boolean NOT NULL DEFAULT false, "isEmergencyContact" boolean NOT NULL DEFAULT true, "canReceiveNotifications" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_11ef78f5131711d8da1b14e3332" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "sections" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "branchId" uuid NOT NULL, "schoolYearId" uuid NOT NULL, "gradeLevelId" uuid, "strandId" uuid, "programId" uuid, "name" character varying NOT NULL, "adviserEmployeeId" uuid, "roomId" uuid, "capacity" integer NOT NULL DEFAULT '40', "isActive" boolean NOT NULL DEFAULT true, "homeroom" character varying, "assignmentRules" jsonb NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f9749dd3bffd880a497d007e450" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "section_assignment_rules" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "sectionId" uuid NOT NULL, "ruleType" character varying NOT NULL, "ruleConfig" jsonb NOT NULL, "priority" integer NOT NULL DEFAULT '0', "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d5fb420e41fda01b7a3c0a6e809" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "health_records" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "studentId" uuid NOT NULL, "recordType" character varying NOT NULL, "title" character varying, "description" character varying, "recordDate" date, "recordedByUserId" character varying, "clinician" character varying, "diagnosis" character varying, "treatment" character varying, "medication" character varying, "followUpDate" TIMESTAMP, "parentNotified" boolean, "attachments" jsonb NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_adbd60dda85d616da89ba3f8270" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "guardians" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "userId" uuid, "firstName" character varying NOT NULL, "middleName" character varying, "lastName" character varying NOT NULL, "suffix" character varying, "contactNumber" character varying, "email" character varying, "address" character varying, "occupation" character varying, "employer" character varying, "relationshipToStudent" character varying, "customFields" jsonb NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3dcf02f3dc96a2c017106f280be" PRIMARY KEY ("id"));

CREATE INDEX IF NOT EXISTS "idx_guardians_user" ON "guardians" ("userId");

CREATE TABLE IF NOT EXISTS "enrollment_holds" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "enrollmentId" uuid NOT NULL, "studentId" uuid NOT NULL, "holdType" character varying NOT NULL, "reason" character varying, "blocksSchedule" boolean NOT NULL DEFAULT true, "blocksTor" boolean NOT NULL DEFAULT false, "blocksExamPermit" boolean NOT NULL DEFAULT false, "isActive" boolean NOT NULL DEFAULT true, "placedBy" character varying, "placedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "releasedBy" character varying, "releasedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b6fed1eaa34ce503271ced6104d" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "behavior_incidents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "studentId" uuid NOT NULL, "enrollmentId" uuid, "incidentType" character varying NOT NULL, "description" character varying NOT NULL, "incidentDate" date NOT NULL, "incidentLocation" character varying, "witnesses" character varying, "actionTaken" character varying, "reportedBy" character varying, "reportedToUserId" character varying, "status" character varying NOT NULL DEFAULT 'open', "resolution" character varying, "followUpDate" TIMESTAMP, "attachments" jsonb NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9bb14887a5543f007f2ca770651" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "promotion_decisions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "studentId" uuid NOT NULL, "enrollmentId" uuid NOT NULL, "schoolYearId" uuid NOT NULL, "gradeLevelId" uuid NOT NULL, "decision" character varying NOT NULL, "targetGradeLevelId" uuid, "remarks" character varying, "decidedBy" character varying, "decidedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "isFinalized" boolean NOT NULL DEFAULT false, "finalizedBy" character varying, "finalizedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d874e3710af617f28416d426fa9" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "applicants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "branchId" character varying, "firstName" character varying NOT NULL, "middleName" character varying, "lastName" character varying NOT NULL, "email" character varying, "phone" character varying, "birthDate" date, "gender" character varying, "address" character varying, "previousSchool" character varying, "gradeLevelAppliedFor" character varying, "source" character varying, "status" character varying NOT NULL DEFAULT 'new', "stageId" character varying, "notes" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c02ec3c46124479ce758ca50943" PRIMARY KEY ("id"));

CREATE INDEX IF NOT EXISTS "idx_applicants_stage" ON "applicants" ("tenantId", "stageId", "status");

CREATE INDEX IF NOT EXISTS "idx_applicants_tenant" ON "applicants" ("tenantId");

CREATE TABLE IF NOT EXISTS "applicant_stage_transitions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "fromStageId" uuid NOT NULL, "toStageId" uuid NOT NULL, "requiredRole" character varying, "autoTransition" boolean, "conditions" jsonb, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a10c5674e49e3bfa90dbf5fd139" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "student_schedules" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "enrollmentId" uuid NOT NULL, "studentId" uuid NOT NULL, "classOfferingId" uuid NOT NULL, "subjectId" uuid NOT NULL, "sectionId" uuid, "roomId" uuid, "timeSlot" jsonb NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1252cd1d427422be13e201ee3c8" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "applicant_stage_configs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "branchId" uuid, "educationLevelId" uuid, "stageName" character varying NOT NULL, "stageCode" character varying NOT NULL, "sortOrder" integer NOT NULL DEFAULT '0', "isDefault" boolean NOT NULL DEFAULT false, "isActive" boolean NOT NULL DEFAULT true, "autoAdmitOnComplete" boolean, "requiredDocuments" text, "config" jsonb NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_940a9f07ca56f02ba5abc6551fc" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "grade_entries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "studentId" uuid NOT NULL, "enrollmentId" uuid NOT NULL, "classOfferingId" uuid NOT NULL, "gradingSystemId" uuid NOT NULL, "gradeComponentId" uuid NOT NULL, "termId" uuid NOT NULL, "rawScore" numeric, "maxScore" numeric, "percentage" numeric, "transmutedGrade" numeric, "remarks" text, "isFinalized" boolean NOT NULL DEFAULT false, "enteredByUserId" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_01ecf2b2337fe10004fd843a652" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "school_calendars" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "branchId" uuid NOT NULL, "schoolYearId" uuid NOT NULL, "name" character varying NOT NULL, "startDate" date NOT NULL, "endDate" date NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "config" jsonb NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2dcdfe93ca062791f4aefecee29" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "permanent_records" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "studentId" uuid NOT NULL, "enrollmentId" uuid NOT NULL, "schoolYearId" uuid NOT NULL, "gradeLevelId" uuid NOT NULL, "recordType" jsonb NOT NULL, "grades" jsonb NOT NULL DEFAULT '{}', "attendance" jsonb NOT NULL DEFAULT '{}', "generalAverage" numeric(5,2), "rank" integer, "remarks" character varying, "status" character varying NOT NULL DEFAULT 'draft', "verifiedByUserId" character varying, "verifiedAt" TIMESTAMP WITH TIME ZONE, "documentUrl" character varying, "verificationCode" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_891a7130201bb87fce2f2e64242" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "students" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "branchId" uuid, "lrn" character varying, "studentNumber" character varying, "firstName" character varying NOT NULL, "middleName" character varying, "lastName" character varying NOT NULL, "suffix" character varying, "birthDate" date, "sex" character varying, "address" character varying, "photoUrl" character varying, "priorSchool" character varying, "healthFlags" character varying, "iepNotes" character varying, "govIdType" character varying, "govIdNumber" character varying, "status" character varying NOT NULL DEFAULT 'active', "customFields" jsonb NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP, "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_3ff076e239ff049ae82992ebb51" UNIQUE ("lrn"), CONSTRAINT "PK_7d7f07271ad4ce999880713f05e" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "grade_change_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "studentId" uuid NOT NULL, "enrollmentId" uuid NOT NULL, "classOfferingId" uuid NOT NULL, "gradeEntryId" uuid NOT NULL, "workflowInstanceId" uuid, "requestedByUserId" uuid NOT NULL, "oldScore" numeric, "newScore" numeric, "reason" text, "status" character varying NOT NULL DEFAULT 'pending', "approvedByUserId" character varying, "approvedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8a1ac9aa3dbd33961dbd782280f" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "attendance_notification_thresholds" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "branchId" uuid, "educationLevelId" uuid, "absenceCountThreshold" numeric NOT NULL DEFAULT '3', "tardyCountThreshold" numeric NOT NULL DEFAULT '3', "consecutiveAbsenceThreshold" numeric NOT NULL DEFAULT '5', "notificationChannel" character varying NOT NULL DEFAULT 'email', "notifyGuardian" boolean NOT NULL DEFAULT true, "notifyAdviser" boolean NOT NULL DEFAULT false, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_17f2a10dcde61cb95676e688228" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "calendar_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "calendarId" uuid NOT NULL, "eventType" character varying NOT NULL, "title" character varying NOT NULL, "description" character varying, "startDate" date NOT NULL, "endDate" date, "isHoliday" boolean NOT NULL DEFAULT false, "isExamWeek" boolean NOT NULL DEFAULT false, "isTrainingDay" boolean NOT NULL DEFAULT false, "metadata" jsonb NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_faf5391d232322a87cdd1c6f30c" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "attendance_excuses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "studentId" uuid NOT NULL, "attendanceRecordId" uuid NOT NULL, "excuseType" character varying NOT NULL, "description" text, "documentUrl" character varying, "status" character varying NOT NULL DEFAULT 'pending', "reviewedByUserId" character varying, "reviewNotes" character varying, "submittedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2bbb9aad91e57335848938f8afb" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "attendance_records" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "studentId" uuid NOT NULL, "enrollmentId" uuid NOT NULL, "sectionId" uuid NOT NULL, "classOfferingId" uuid NOT NULL, "attendanceDate" date NOT NULL, "periodNumber" integer, "status" character varying NOT NULL, "minutesLate" integer, "excuseReason" character varying, "recordedByUserId" character varying, "verifiedByUserId" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_946920332f5bc9efad3f3023b96" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "faculty_load_limits" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "branchId" uuid, "employeeId" uuid, "maxUnits" numeric NOT NULL DEFAULT '24', "maxHoursPerWeek" numeric NOT NULL DEFAULT '40', "warnOnApproachPct" numeric NOT NULL DEFAULT 0.8, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d252dacf36f472a98ca2d79c89c" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "scheduled_reports" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "reportTemplateId" uuid NOT NULL, "name" character varying NOT NULL, "frequency" character varying NOT NULL, "recipients" text NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "lastRunAt" TIMESTAMP WITH TIME ZONE, "lastRunStatus" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4e9443d4280f94e84c7349300a6" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "attendance_config" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "branchId" uuid, "educationLevelId" uuid NOT NULL, "captureMode" character varying NOT NULL DEFAULT 'daily', "allowLateSubmission" boolean NOT NULL DEFAULT true, "lateGracePeriodMinutes" numeric NOT NULL DEFAULT '15', "notifyGuardianOnAbsence" boolean NOT NULL DEFAULT true, "config" jsonb NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d63110530cdd359332a88396b78" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "report_templates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "name" character varying NOT NULL, "reportType" jsonb NOT NULL, "config" jsonb NOT NULL DEFAULT '{}', "description" character varying, "isSystem" boolean NOT NULL DEFAULT true, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f85e16e6beea41a2b3a3350b84e" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "teaching_loads" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "branchId" uuid NOT NULL, "employeeId" uuid NOT NULL, "classOfferingId" uuid NOT NULL, "schoolYearId" uuid NOT NULL, "termId" uuid NOT NULL, "isSubstitute" boolean NOT NULL DEFAULT false, "substituteForEmployeeId" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0d057dea1dcaf2597d306e6d3bd" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "employees" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "branchId" uuid, "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "email" character varying, "contactNumber" character varying, "photoUrl" character varying, "hireDate" date, "position" character varying, "department" character varying, "employmentStatus" character varying, "sssNo" character varying, "philhealthNo" character varying, "pagibigNo" character varying, "tinNo" character varying, "customFields" jsonb NOT NULL DEFAULT '{}', "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b9535a98350d5b26e7eb0c26af4" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "dtr_records" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "branchId" uuid NOT NULL, "employeeId" uuid NOT NULL, "attendanceDate" date NOT NULL, "timeIn" TIME, "timeOut" TIME, "source" character varying NOT NULL DEFAULT 'manual', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5f38d14be803796a67d745c188b" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "buildings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "branchId" uuid NOT NULL, "name" character varying NOT NULL, "code" character varying, "address" character varying, "floorCount" integer, "contact" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_bc65c1acce268c383e41a69003a" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "floors" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "buildingId" uuid NOT NULL, "label" character varying NOT NULL, "floorNumber" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_dae78234002afa84842d3a08ee0" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "room_assets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "branchId" uuid NOT NULL, "roomId" uuid NOT NULL, "assetTag" character varying NOT NULL, "assetType" character varying NOT NULL, "condition" character varying, "maintenanceFlag" boolean NOT NULL DEFAULT false, "notes" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3d80470a7e85886687776c0b744" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "rooms" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "branchId" uuid NOT NULL, "floorId" uuid NOT NULL, "name" character varying NOT NULL, "roomType" character varying NOT NULL, "capacity" integer, "seatingLayout" character varying, "status" character varying NOT NULL DEFAULT 'active', "equipmentTags" text array NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0368a2d7c215f2d0458a54933f2" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "generated_documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "branchId" uuid NOT NULL, "studentId" uuid NOT NULL, "templateId" uuid NOT NULL, "requestId" uuid, "fileUrl" character varying NOT NULL, "verificationCode" character varying NOT NULL, "qrPayload" character varying, "releasedBy" character varying, "releasedAt" TIMESTAMP WITH TIME ZONE, "isVoided" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_adf23951f7aa5997a090992eccf" UNIQUE ("verificationCode"), CONSTRAINT "PK_93d5f4d6fdc3c0fcc5a7a3aedc2" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "education_levels" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "code" character varying, "name" character varying NOT NULL, "description" character varying, "sortOrder" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_87650fa9bdce80639107ce2ba23" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "document_templates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "name" character varying NOT NULL, "documentType" character varying NOT NULL, "content" jsonb NOT NULL DEFAULT '{}', "versionLabel" character varying, "signatoryRequired" boolean NOT NULL DEFAULT false, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0372838b7b7cd3571aef80466d1" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "document_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "branchId" uuid NOT NULL, "studentId" uuid NOT NULL, "documentTemplateId" uuid NOT NULL, "status" character varying NOT NULL DEFAULT 'requested', "feeAmount" numeric(12,2) NOT NULL DEFAULT '0', "paymentId" uuid, "releasedBy" character varying, "releasedAt" TIMESTAMP WITH TIME ZONE, "verificationCode" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_43076ee267e48f196b68ce008e6" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "workflow_instances" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "workflowDefinitionId" uuid NOT NULL, "entityType" character varying NOT NULL, "entityId" character varying NOT NULL, "currentStep" integer NOT NULL DEFAULT '0', "status" character varying NOT NULL DEFAULT 'pending', "requestedBy" character varying, "requestedAt" TIMESTAMP WITH TIME ZONE, "reason" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_90cc94e44ff8b7b7869f50e4fc4" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "workflow_definitions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "entityType" character varying NOT NULL, "name" character varying NOT NULL, "description" character varying, "steps" jsonb NOT NULL DEFAULT '[]', "slaHours" integer NOT NULL DEFAULT '48', "escalationTo" character varying, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4f92fadfc5fb722f080ceaec272" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "workflow_approvals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "instanceId" uuid NOT NULL, "approverUserId" uuid NOT NULL, "stepIndex" integer NOT NULL, "decision" character varying NOT NULL, "reason" character varying, "decidedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_36949dc46e63a84b77b624651ef" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "numbering_schemes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "branchId" uuid, "name" character varying NOT NULL, "entityType" character varying NOT NULL, "format" character varying NOT NULL, "counterValue" bigint NOT NULL DEFAULT '0', "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b8e765aef8393772530d1e42c49" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "lookup_lists" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "name" character varying NOT NULL, "entityType" character varying NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4af8fe54e70ea38e9d75b733818" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "lookup_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "lookupListId" uuid NOT NULL, "label" character varying NOT NULL, "value" character varying NOT NULL, "sortOrder" integer, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2b0e0240c0ad7e09926a7cc867a" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "feature_flags" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "branchId" uuid, "flagKey" character varying NOT NULL, "enabled" boolean NOT NULL DEFAULT false, "rolloutPercentage" integer NOT NULL DEFAULT '100', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_db657d344e9caacfc9d5cf8bbac" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "custom_field_definitions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "entityType" character varying NOT NULL, "fieldKey" character varying NOT NULL, "fieldType" character varying NOT NULL, "label" character varying NOT NULL, "required" boolean NOT NULL DEFAULT false, "validationRules" jsonb NOT NULL DEFAULT '{}', "options" jsonb NOT NULL DEFAULT '[]', "visibilityRules" jsonb NOT NULL DEFAULT '{}', "sortOrder" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_91f4cf6416f7aeb02c217005cb2" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "audit_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "branchId" uuid, "actorUserId" uuid, "entityType" character varying NOT NULL, "entityId" character varying NOT NULL, "action" character varying NOT NULL, "beforeState" jsonb, "afterState" jsonb, "ipAddress" character varying, "requestId" character varying, "correlationId" character varying, "occurredAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_910f64d901a5c3e9878f0d4a407" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "notification_rules" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "eventType" character varying NOT NULL, "threshold" jsonb NOT NULL DEFAULT '{}', "templateId" uuid NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_eb87ba4f7f01eabf003fcf4e65c" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "notification_templates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "name" character varying NOT NULL, "eventType" character varying NOT NULL, "channel" character varying NOT NULL, "subject" character varying, "bodyTemplate" text NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_76f0fc48b8d057d2ae7f3a2848a" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "notification_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "branchId" uuid NOT NULL, "templateId" uuid, "channel" character varying NOT NULL, "recipientUserId" uuid, "recipientContact" jsonb, "payload" jsonb NOT NULL DEFAULT '{}', "status" character varying NOT NULL DEFAULT 'queued', "providerMsgId" character varying, "sentAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_19c524e644cdeaebfcffc284871" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "threadId" uuid NOT NULL, "senderUserId" uuid NOT NULL, "body" text NOT NULL, "attachmentUrl" character varying, "readAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "message_threads" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "branchId" uuid NOT NULL, "subject" character varying, "studentId" uuid, "createdBy" character varying, "participantIds" jsonb NOT NULL DEFAULT '[]', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_257a191f664b9470b5d94f98264" PRIMARY KEY ("id"));

CREATE INDEX IF NOT EXISTS "IDX_6af99c548fac91178c01a4318e" ON "message_threads" ("participantIds");

CREATE TABLE IF NOT EXISTS "channel_configs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "branchId" uuid, "channel" character varying NOT NULL, "provider" character varying NOT NULL, "credentialsRef" character varying NOT NULL, "senderId" character varying, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_71b592f5e0da6907fce0f0654cb" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "announcements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "branchId" uuid, "title" character varying NOT NULL, "body" text NOT NULL, "audienceType" character varying NOT NULL, "audienceIds" text NOT NULL DEFAULT '', "channel" text NOT NULL DEFAULT 'sms,email,push', "createdBy" character varying, "sentAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b3ad760876ff2e19d58e05dc8b0" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "refunds" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "branchId" uuid NOT NULL, "originalOrId" uuid NOT NULL, "paymentId" uuid, "invoiceId" character varying NOT NULL, "amount" numeric(12,2) NOT NULL, "reason" character varying NOT NULL, "approvedBy" character varying, "status" character varying NOT NULL DEFAULT 'pending', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5106efb01eeda7e49a78b869738" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "branchId" uuid NOT NULL, "invoiceId" uuid, "adHocSaleId" uuid, "cashierSessionId" uuid, "amount" numeric(12,2) NOT NULL, "method" character varying NOT NULL, "gatewayReference" character varying, "idempotencyKey" character varying, "status" character varying NOT NULL DEFAULT 'completed', "paidAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "offlineOrigin" boolean NOT NULL DEFAULT false, "syncedAt" TIMESTAMP WITH TIME ZONE, "denominationBreakdown" jsonb NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_743b9fb1d2a059f2f7860418e4e" UNIQUE ("idempotencyKey"), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "payment_methods" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "code" character varying NOT NULL, "name" character varying NOT NULL, "isCash" boolean NOT NULL DEFAULT false, "requiresGatewayRef" boolean NOT NULL DEFAULT false, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_34f9b8c6dfb4ac3559f7e2820d1" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "series_counters" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "branchId" uuid NOT NULL, "atpSeriesId" uuid NOT NULL, "counterValue" bigint NOT NULL DEFAULT '0', "reservedBlockStart" bigint, "reservedBlockEnd" bigint, "sessionId" uuid, "reservedAt" TIMESTAMP WITH TIME ZONE, "expiresAt" TIMESTAMP WITH TIME ZONE, "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0269b1e9e90044ad2dd372b574d" PRIMARY KEY ("id"));

CREATE UNIQUE INDEX IF NOT EXISTS "uq_series_counters_scope" ON "series_counters" ("tenantId", "branchId", "atpSeriesId");

CREATE TABLE IF NOT EXISTS "enrollments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "branchId" uuid NOT NULL, "studentId" uuid NOT NULL, "schoolYearId" uuid NOT NULL, "curriculumId" uuid NOT NULL, "sectionId" uuid, "status" character varying NOT NULL DEFAULT 'enrolled', "enrolledAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "gradeLevelId" uuid, "strandId" uuid, "programId" uuid, "previousSchoolYearId" uuid, "previousGradeLevelId" uuid, "notes" character varying, "customFields" jsonb NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7c0f752f9fb68bf6ed7367ab00f" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "payment_allocations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "paymentId" uuid NOT NULL, "invoiceId" uuid NOT NULL, "amountApplied" numeric(12,2) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a5c6ff22065ac772620c85f4efb" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "official_receipts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "branchId" uuid NOT NULL, "paymentId" uuid NOT NULL, "orNumber" character varying NOT NULL, "orNumberDisplay" character varying, "atpSeriesId" character varying NOT NULL, "payorName" character varying, "payorTin" character varying, "amount" numeric(12,2) NOT NULL DEFAULT '0', "isTaxExempt" boolean NOT NULL DEFAULT false, "isVoided" boolean NOT NULL DEFAULT false, "voidReason" character varying, "reversedBy" character varying, "issuedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_24fe45ad9af64c067aef2c20daa" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "denomination_sets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "currency" character varying NOT NULL DEFAULT 'PHP', "denominations" text NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ee93e22d98f25cd850f53d0835b" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "cashier_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "branchId" uuid NOT NULL, "stationId" uuid, "cashierUserId" uuid NOT NULL, "openingFloat" numeric(12,2) NOT NULL, "denominationBreakdown" jsonb NOT NULL DEFAULT '{}', "openedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "closingActual" numeric(12,2), "closedAt" TIMESTAMP WITH TIME ZONE, "status" character varying NOT NULL DEFAULT 'open', "varianceAmount" numeric(12,2), "varianceApprovedBy" character varying, "varianceApprovedAt" TIMESTAMP WITH TIME ZONE, "shiftReportUrl" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_46e6cc581c2e2d21cb1e29e3ba0" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "cashier_stations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "branchId" uuid NOT NULL, "stationCode" character varying NOT NULL, "printerConfig" jsonb NOT NULL DEFAULT '{}', "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4a42561acaf9d2fc2b54894bb28" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "atp_series" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "branchId" uuid NOT NULL, "name" character varying NOT NULL, "rangeStart" bigint NOT NULL, "rangeEnd" bigint NOT NULL, "validFrom" date NOT NULL, "validTo" date NOT NULL, "prefix" character varying, "formatTemplate" character varying, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8403fec63641e096cf95c8898f2" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "ad_hoc_sale_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "adHocSaleId" uuid NOT NULL, "description" character varying NOT NULL, "quantity" integer NOT NULL DEFAULT '1', "unitPrice" numeric(12,2) NOT NULL, "discountAmount" numeric(12,2) NOT NULL DEFAULT '0', "lineTotal" numeric(12,2) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_129c5a17fe16f5f3445ce209615" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "ad_hoc_sales" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "branchId" uuid NOT NULL, "sessionId" uuid NOT NULL, "buyerName" character varying, "totalAmount" numeric(12,2) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_687671cf7b56b74a4400d2e69af" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "withdrawal_policies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "branchId" uuid, "name" character varying NOT NULL, "withinDays" integer NOT NULL, "refundPercentage" numeric NOT NULL, "isProRated" boolean NOT NULL DEFAULT true, "description" character varying, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_08d6ad1d96e66320aea6173d5ad" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "student_discount_grants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "studentId" uuid NOT NULL, "enrollmentId" uuid NOT NULL, "discountTypeId" uuid NOT NULL, "percentage" numeric, "fixedAmount" numeric, "reason" text, "supportingDocumentUrl" text, "status" character varying NOT NULL DEFAULT 'pending', "approvedByUserId" character varying, "approvedAt" TIMESTAMP WITH TIME ZONE, "workflowInstanceId" character varying, "validFrom" date, "validUntil" date, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3217db86c187a3bde3b1b6d2b6c" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "payment_plans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "branchId" uuid, "name" character varying NOT NULL, "description" character varying, "numberOfInstallments" integer NOT NULL DEFAULT '1', "cashDiscountPercentage" numeric NOT NULL DEFAULT '0', "installmentFee" numeric NOT NULL DEFAULT '0', "penaltyPercentage" numeric NOT NULL DEFAULT '0', "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8f05aee900e96c2e0c24df48262" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "penalty_rules" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "branchId" uuid, "name" character varying NOT NULL, "gracePeriodDays" integer NOT NULL DEFAULT '1', "penaltyPercentage" numeric NOT NULL DEFAULT '0', "penaltyFixedAmount" numeric NOT NULL DEFAULT '0', "maxPenaltyAmount" numeric NOT NULL DEFAULT '0', "computationType" character varying NOT NULL DEFAULT 'daily', "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f17c98d146939f4d584862a302f" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "invoice_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "invoiceId" uuid NOT NULL, "feeTypeId" uuid NOT NULL, "description" character varying, "amount" numeric NOT NULL, "discountAmount" numeric NOT NULL DEFAULT '0', "taxAmount" numeric NOT NULL DEFAULT '0', "netAmount" numeric NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_53b99f9e0e2945e69de1a12b75a" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "invoices" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "branchId" uuid NOT NULL, "studentId" uuid NOT NULL, "enrollmentId" uuid NOT NULL, "termId" uuid, "invoiceNumber" character varying, "totalAmount" numeric NOT NULL DEFAULT '0', "discountAmount" numeric NOT NULL DEFAULT '0', "penaltyAmount" numeric NOT NULL DEFAULT '0', "paidAmount" numeric NOT NULL DEFAULT '0', "balance" numeric NOT NULL DEFAULT '0', "status" character varying NOT NULL DEFAULT 'open', "dueDate" date, "paymentPlanId" uuid, "metadata" jsonb NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_668cef7c22a427fd822cc1be3ce" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "installment_schedules" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "invoiceId" uuid NOT NULL, "paymentPlanId" uuid NOT NULL, "installmentNumber" integer NOT NULL, "amount" numeric NOT NULL, "dueDate" date NOT NULL, "penaltyAmount" numeric NOT NULL DEFAULT '0', "paidAmount" numeric NOT NULL DEFAULT '0', "status" character varying NOT NULL DEFAULT 'pending', "paidAt" date, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_253c6ebbc1b8d2dc50e83a36c82" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "fee_types" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "code" character varying NOT NULL, "name" character varying NOT NULL, "description" character varying, "isTaxable" boolean NOT NULL DEFAULT false, "taxRate" numeric NOT NULL DEFAULT '0', "glAccount" character varying, "isActive" boolean NOT NULL DEFAULT true, "isSystem" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_13c213789b6c9fc376303db1fb9" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "fee_structures" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "branchId" uuid, "templateKey" character varying, "educationLevelId" uuid, "gradeLevelId" uuid, "strandId" uuid, "programId" uuid, "schoolYearId" uuid NOT NULL, "termId" uuid, "status" character varying NOT NULL DEFAULT 'active', "name" character varying, "description" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d634078deb9cf5ceb5788ad9b53" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "fee_structure_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "feeStructureId" uuid NOT NULL, "feeTypeId" uuid NOT NULL, "amount" numeric NOT NULL, "isRequired" boolean NOT NULL DEFAULT true, "description" character varying, "sortOrder" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_dfb11c01a68b4d7169b26ed7e69" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "discount_types" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "code" character varying NOT NULL, "name" character varying NOT NULL, "description" character varying, "discountMode" character varying NOT NULL DEFAULT 'percentage', "defaultPercentage" numeric NOT NULL DEFAULT '0', "defaultAmount" numeric NOT NULL DEFAULT '0', "requiresApproval" boolean NOT NULL DEFAULT true, "isActive" boolean NOT NULL DEFAULT true, "isScholarship" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b8680bade668df47e67dcdfc93b" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "school_years" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "name" character varying NOT NULL, "startDate" date, "endDate" date, "status" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3fe99d570a61178cb99065783cf" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "terms" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "schoolYearId" uuid NOT NULL, "name" character varying, "sequence" integer, "startDate" date, "endDate" date, "gradingDeadline" date, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_33b6fe77d6ace7ff43cc8a65958" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "tracks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "name" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_242a37ffc7870380f0e611986e8" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "strands" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "trackId" uuid, "name" character varying NOT NULL, "code" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_70b329e4ab09529659462df5392" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "subjects" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "code" character varying NOT NULL, "title" character varying NOT NULL, "description" text, "units" numeric(4,1), "hoursPerWeek" numeric(4,1), "lectureHours" numeric(4,1), "labHours" numeric(4,1), "isCore" boolean NOT NULL DEFAULT true, "isElective" boolean NOT NULL DEFAULT false, "learningArea" character varying, "coRequisiteSubjectId" character varying, "versionLabel" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1a023685ac2b051b4e557b0b280" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "programs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "code" character varying NOT NULL, "name" character varying NOT NULL, "level" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d43c664bcaafc0e8a06dfd34e05" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "honor_roll_configs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "branchId" uuid, "educationLevelId" uuid NOT NULL, "schoolYearId" uuid NOT NULL, "withHonorsThreshold" numeric(5,2), "withHighHonorsThreshold" numeric(5,2), "withHighestHonorsThreshold" numeric(5,2), "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b71f9c6bf7c7b87785e11a1d727" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "grading_systems" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "branchId" uuid, "educationLevelId" uuid NOT NULL, "schoolYearId" uuid NOT NULL, "name" character varying NOT NULL, "type" character varying NOT NULL, "config" jsonb NOT NULL DEFAULT '{}', "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b5c08039cdd918de98652c19eb4" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "grade_levels" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "educationLevelId" uuid NOT NULL, "code" character varying, "name" character varying NOT NULL, "sortOrder" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6acd477de8b53978fc389479713" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "grade_components" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "gradingSystemId" uuid NOT NULL, "name" character varying NOT NULL, "weight" numeric(5,2) NOT NULL, "order" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_976138902c8bcede7e4fe4ec3c7" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "curricula" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "branchId" uuid, "educationLevelId" uuid NOT NULL, "gradeLevelId" uuid, "strandId" uuid, "programId" uuid, "schoolYearId" uuid NOT NULL, "versionLabel" character varying, "status" character varying NOT NULL DEFAULT 'draft', "clonedFromCurriculumId" character varying, "clonedAt" TIMESTAMP WITH TIME ZONE, "clonedBy" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7c5dd2066e2bbf3b6ad0a71c567" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "curriculum_subjects" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "curriculumId" uuid NOT NULL, "subjectId" uuid NOT NULL, "termId" uuid, "prerequisiteSubjectId" uuid, "coRequisiteSubjectId" uuid, "order" integer, "effectiveGradingSystemId" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a732b6eb93955090ef3690062c4" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "class_offerings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "branchId" uuid NOT NULL, "schoolYearId" uuid NOT NULL, "termId" uuid NOT NULL, "sectionId" uuid NOT NULL, "subjectId" uuid NOT NULL, "facultyEmployeeId" uuid, "roomId" uuid, "timeSlots" jsonb NOT NULL DEFAULT '[]', "units" numeric NOT NULL DEFAULT '0', "hoursPerWeek" numeric NOT NULL DEFAULT '0', "status" character varying NOT NULL DEFAULT 'active', "notes" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_606ab9efbebc0967066902f950a" PRIMARY KEY ("id"));

DO $$
BEGIN
  ALTER TABLE "departments" ADD CONSTRAINT "FK_b01d8cc3129c198d66516f98faf" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "branches" ADD CONSTRAINT "FK_19db6a12993aa421cc984376635" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "tenants" ADD CONSTRAINT "FK_bf4b8434d205b4a051fa0c89aa3" FOREIGN KEY ("planId") REFERENCES "tenant_plans"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "floors" ADD CONSTRAINT "FK_58ed6d6bd6268cdf83b7c72d1b5" FOREIGN KEY ("buildingId") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "room_assets" ADD CONSTRAINT "FK_9d14620ca4cc7fb06ba2bb38c70" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "rooms" ADD CONSTRAINT "FK_4d1c2078e85df4b86a6e80348e5" FOREIGN KEY ("floorId") REFERENCES "floors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "terms" ADD CONSTRAINT "FK_8ccf58120321db1b8293c4f3575" FOREIGN KEY ("schoolYearId") REFERENCES "school_years"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "strands" ADD CONSTRAINT "FK_fc6bfe4d17de26fd6624a6b1aaa" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "grade_levels" ADD CONSTRAINT "FK_5c37bf12408d2dcce1645aad2f0" FOREIGN KEY ("educationLevelId") REFERENCES "education_levels"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- SUPPLEMENTARY TABLES (no entity — used by IdempotencyGuard)
-- ============================================================
-- Shape matches the deployed table (key is the primary key; request_method /
-- request_path / created_at are NOT NULL) plus the `id` column that
-- IdempotencyGuard reads (`SELECT id FROM idempotency_keys`). The previous
-- definition here had `id` as the primary key, a `response` column, and
-- nullable request columns — none of which existed in the deployed table.
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  key TEXT PRIMARY KEY,
  request_method TEXT NOT NULL,
  request_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_key ON idempotency_keys(key);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires ON idempotency_keys(expires_at);

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================
-- Defined in 003-rls-policies.sql (all tenant-scoped tables) and refined by
-- 012-hardening-rls-and-or-race.sql / 013-platform-admin-rls.sql /
-- 014-rls-platform-admin-role-gate.sql. Kept out of this file so the policy
-- names do not collide.
