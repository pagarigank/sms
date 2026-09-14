-- 008: billing schema reconciliation (G-21) + billing reference seed (Phase 6 audit).
--
-- Schema fixes so the live DB matches the corrected entities:
--   * invoices.paymentPlanId: jsonb -> uuid  (it holds a payment_plans FK)
--   * student_discount_grants.reason / supportingDocumentUrl: uuid -> text
--     (they hold free-text reasons / document URLs, not FKs)
--
-- Seed: billing reference data for the demo tenant (all guarded by NOT EXISTS,
-- so re-running is a no-op), including a tenant-default fee structure for the
-- active school year so enrollment auto-invoicing works out of the box.

BEGIN;

-- ===== schema reconciliation =====
ALTER TABLE "invoices" ALTER COLUMN "paymentPlanId" TYPE uuid USING NULLIF("paymentPlanId"::text, '')::uuid;
ALTER TABLE "student_discount_grants" ALTER COLUMN "reason" TYPE text USING "reason"::text;
ALTER TABLE "student_discount_grants" ALTER COLUMN "supportingDocumentUrl" TYPE text USING "supportingDocumentUrl"::text;

-- ===== seed =====
-- Demo tenant
-- fee types
INSERT INTO "fee_types" ("id", "tenantId", "code", "name", "description", "isTaxable", "taxRate", "glAccount", "isActive", "isSystem")
SELECT * FROM (VALUES
  ('f1000000-0000-0000-0000-000000000001'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'TUITION', 'Tuition Fee', 'Regular tuition', false, 0, '4000', true, true),
  ('f1000000-0000-0000-0000-000000000002'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'MISC', 'Miscellaneous Fee', 'Local fees and dues', false, 0, '4100', true, true),
  ('f1000000-0000-0000-0000-000000000003'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'REG', 'Registration Fee', 'One-time registration', false, 0, '4200', true, true),
  ('f1000000-0000-0000-0000-000000000004'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'BOOKS', 'Books & Materials', 'Textbooks and learning materials', false, 0, '4300', true, false),
  ('f1000000-0000-0000-0000-000000000005'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'LAB', 'Laboratory Fee', 'Lab usage and consumables', false, 0, '4400', true, false),
  ('f1000000-0000-0000-0000-000000000006'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'ID', 'ID & School Forms', 'Student ID and forms', false, 0, '4500', true, false)
) AS v
WHERE NOT EXISTS (SELECT 1 FROM "fee_types" WHERE "tenantId" = '10000000-0000-0000-0000-000000000001'::uuid);

-- discount types
INSERT INTO "discount_types" ("id", "tenantId", "code", "name", "description", "discountMode", "defaultPercentage", "defaultAmount", "requiresApproval", "isActive", "isScholarship")
SELECT * FROM (VALUES
  ('f2000000-0000-0000-0000-000000000001'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'SIBLING', 'Sibling Discount', 'Second enrolled sibling onward', 'percentage', 10, 0, false, true, false),
  ('f2000000-0000-0000-0000-000000000002'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'ACAD_SCHOLAR', 'Academic Scholarship', 'Top academic performers', 'percentage', 50, 0, true, true, true),
  ('f2000000-0000-0000-0000-000000000003'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'HONOR', 'Honor Discount', 'With honors enrollees', 'percentage', 25, 0, true, true, true),
  ('f2000000-0000-0000-0000-000000000004'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'ATHLETE', 'Athletic Scholarship', 'Varsity athletes', 'percentage', 20, 0, true, true, true),
  ('f2000000-0000-0000-0000-000000000005'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'EMC', 'Employee Minor Child', 'Children of employees', 'percentage', 100, 0, true, true, true)
) AS v
WHERE NOT EXISTS (SELECT 1 FROM "discount_types" WHERE "tenantId" = '10000000-0000-0000-0000-000000000001'::uuid);

-- payment plans
INSERT INTO "payment_plans" ("id", "tenantId", "name", "description", "numberOfInstallments", "cashDiscountPercentage", "installmentFee", "penaltyPercentage", "isActive")
SELECT * FROM (VALUES
  ('f3000000-0000-0000-0000-000000000001'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'Annual (Cash)', 'Full payment on enrollment', 1, 5, 0, 0, true),
  ('f3000000-0000-0000-0000-000000000002'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'Semestral', '2 installments', 2, 2, 0, 0, true),
  ('f3000000-0000-0000-0000-000000000003'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'Quarterly', '4 installments', 4, 0, 0, 0, true),
  ('f3000000-0000-0000-0000-000000000004'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'Monthly (10x)', '10 monthly installments', 10, 0, 50, 0, true)
) AS v
WHERE NOT EXISTS (SELECT 1 FROM "payment_plans" WHERE "tenantId" = '10000000-0000-0000-0000-000000000001'::uuid);

-- penalty rule
INSERT INTO "penalty_rules" ("id", "tenantId", "name", "gracePeriodDays", "penaltyPercentage", "penaltyFixedAmount", "maxPenaltyAmount", "computationType", "isActive")
SELECT * FROM (VALUES
  ('f4000000-0000-0000-0000-000000000001'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'Standard Late Payment', 5, 2, 0, 5000, 'daily', true)
) AS v
WHERE NOT EXISTS (SELECT 1 FROM "penalty_rules" WHERE "tenantId" = '10000000-0000-0000-0000-000000000001'::uuid);

-- withdrawal policies (brackets: within N days of enrollment)
INSERT INTO "withdrawal_policies" ("id", "tenantId", "name", "withinDays", "refundPercentage", "isProRated", "description", "isActive")
SELECT * FROM (VALUES
  ('f5000000-0000-0000-0000-000000000001'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'Before classes start', 0, 100, false, 'Full refund before the term begins', true),
  ('f5000000-0000-0000-0000-000000000002'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'First week', 7, 90, false, 'Withdrawal within the first week', true),
  ('f5000000-0000-0000-0000-000000000003'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'First two weeks', 15, 50, false, 'Withdrawal within two weeks', true),
  ('f5000000-0000-0000-0000-000000000004'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'Beyond two weeks', 30, 0, true, 'Pro-rated per remaining school days', true)
) AS v
WHERE NOT EXISTS (SELECT 1 FROM "withdrawal_policies" WHERE "tenantId" = '10000000-0000-0000-0000-000000000001'::uuid);

-- tenant-default fee structure for the active school year (no branch/level/
-- grade pins: it matches every enrollment and is overridden by more specific rows)
INSERT INTO "fee_structures" ("id", "tenantId", "templateKey", "schoolYearId", "name", "description", "status")
SELECT
  'f6000000-0000-0000-0000-000000000001'::uuid,
  '10000000-0000-0000-0000-000000000001'::uuid,
  'f6000000-0000-0000-0000-000000000001'::uuid,
  sy."id",
  'Standard Fee Structure (Tenant Default)',
  'Applies to all enrollments for the active school year unless overridden',
  'active'
FROM "school_years" sy
WHERE sy."tenantId" = '10000000-0000-0000-0000-000000000001'::uuid
  AND sy."status" = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM "fee_structures" fs
    WHERE fs."tenantId" = '10000000-0000-0000-0000-000000000001'::uuid
      AND fs."schoolYearId" = sy."id"
  )
LIMIT 1;

-- fee structure items for the default structure
INSERT INTO "fee_structure_items" ("id", "tenantId", "feeStructureId", "feeTypeId", "amount", "isRequired", "description", "sortOrder")
SELECT * FROM (VALUES
  ('f7000000-0000-0000-0000-000000000001'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'f6000000-0000-0000-0000-000000000001'::uuid, 'f1000000-0000-0000-0000-000000000001'::uuid, 18000, true, 'Annual tuition', 1),
  ('f7000000-0000-0000-0000-000000000002'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'f6000000-0000-0000-0000-000000000001'::uuid, 'f1000000-0000-0000-0000-000000000002'::uuid, 3000, true, 'Local/miscellaneous fees', 2),
  ('f7000000-0000-0000-0000-000000000003'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'f6000000-0000-0000-0000-000000000001'::uuid, 'f1000000-0000-0000-0000-000000000003'::uuid, 1500, true, 'Registration', 3),
  ('f7000000-0000-0000-0000-000000000004'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'f6000000-0000-0000-0000-000000000001'::uuid, 'f1000000-0000-0000-0000-000000000004'::uuid, 2000, false, 'Books and materials', 4),
  ('f7000000-0000-0000-0000-000000000005'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'f6000000-0000-0000-0000-000000000001'::uuid, 'f1000000-0000-0000-0000-000000000006'::uuid, 100, false, 'Student ID and forms', 5)
) AS v
WHERE EXISTS (SELECT 1 FROM "fee_structures" WHERE "id" = 'f6000000-0000-0000-0000-000000000001'::uuid)
  AND NOT EXISTS (SELECT 1 FROM "fee_structure_items" WHERE "feeStructureId" = 'f6000000-0000-0000-0000-000000000001'::uuid);

COMMIT;
