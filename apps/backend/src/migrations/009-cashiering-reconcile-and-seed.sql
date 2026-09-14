-- 009: cashiering reconciliation + reference seed (Phase 7 audit).
--
-- Schema fixes so the live DB matches the corrected entities:
--   * cashier_stations.stationCode: jsonb -> varchar (it holds a station code
--     string, not a JSON document). MUST run before the next `synchronize`
--     boot or the jsonb->varchar ALTER crashes without a USING clause.
--   * payment_methods.isCash: new boolean column (drawer accounting).
--   * official_receipts.orNumber is already varchar in the live DB — the
--     ENTITY was corrected to match (it holds a zero-padded sequential
--     number, not a uuid).
--
-- Seed (idempotent): PHP payment methods, a Main Campus cashier station,
-- an ATP OR series for both branches, and the PHP denomination set —
-- without these the cashiering UI cannot even open a session.

BEGIN;

-- ===== schema reconciliation =====
ALTER TABLE "cashier_stations" ALTER COLUMN "stationCode" TYPE varchar USING "stationCode"::text;
ALTER TABLE "payment_methods" ADD COLUMN IF NOT EXISTS "isCash" boolean NOT NULL DEFAULT false;

-- BIR-mandatory OR fields (FR-CSH-4 / G-22) + ATP display format (G-1/G-10)
ALTER TABLE "official_receipts" ADD COLUMN IF NOT EXISTS "payorName" varchar;
ALTER TABLE "official_receipts" ADD COLUMN IF NOT EXISTS "payorTin" varchar;
ALTER TABLE "official_receipts" ADD COLUMN IF NOT EXISTS "amount" numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "official_receipts" ADD COLUMN IF NOT EXISTS "isTaxExempt" boolean NOT NULL DEFAULT false;
ALTER TABLE "atp_series" ADD COLUMN IF NOT EXISTS "prefix" varchar;
ALTER TABLE "atp_series" ADD COLUMN IF NOT EXISTS "formatTemplate" varchar;
UPDATE "atp_series" SET "prefix" = 'OR', "formatTemplate" = 'OR-{year}-{number}' WHERE "formatTemplate" IS NULL;

-- ===== seed =====
-- payment methods (cash counts toward the drawer)
INSERT INTO "payment_methods" ("id", "tenantId", "code", "name", "requiresGatewayRef", "isActive", "isCash")
SELECT * FROM (VALUES
  ('e1000000-0000-0000-0000-000000000001'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'cash', 'Cash', false, true, true),
  ('e1000000-0000-0000-0000-000000000002'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'check', 'Check', false, true, false),
  ('e1000000-0000-0000-0000-000000000003'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'bank_deposit_ref', 'Bank Deposit', false, true, false),
  ('e1000000-0000-0000-0000-000000000004'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'gcash', 'GCash', true, true, false),
  ('e1000000-0000-0000-0000-000000000005'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'maya', 'Maya', true, true, false),
  ('e1000000-0000-0000-0000-000000000006'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'qrph', 'QR Ph', true, true, false),
  ('e1000000-0000-0000-0000-000000000007'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'card', 'Credit/Debit Card', true, true, false),
  ('e1000000-0000-0000-0000-000000000008'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'online', 'Online Transfer', true, true, false)
) AS v
WHERE NOT EXISTS (SELECT 1 FROM "payment_methods" WHERE "tenantId" = '10000000-0000-0000-0000-000000000001'::uuid);

-- cashier station for the Main Campus branch
INSERT INTO "cashier_stations" ("id", "tenantId", "branchId", "stationCode", "printerConfig", "isActive")
SELECT 'e2000000-0000-0000-0000-000000000001'::uuid,
       '10000000-0000-0000-0000-000000000001'::uuid,
       '20000000-0000-0000-0000-000000000001'::uuid,
       'CASHIER-01',
       '{"receiptPrinter": "default", "paperWidth": "80mm"}'::jsonb,
       true
WHERE NOT EXISTS (
  SELECT 1 FROM "cashier_stations" WHERE "branchId" = '20000000-0000-0000-0000-000000000001'::uuid
);

-- ATP official-receipt series per branch (10-year window)
INSERT INTO "atp_series" ("id", "tenantId", "branchId", "name", "rangeStart", "rangeEnd", "validFrom", "validTo", "isActive")
SELECT * FROM (VALUES
  ('e3000000-0000-0000-0000-000000000001'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 'ATP 2026 - Main Campus', 1000001, 2000000, '2026-06-01'::date, '2036-05-31'::date, true),
  ('e3000000-0000-0000-0000-000000000002'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, 'ATP 2026 - North Campus', 1000001, 2000000, '2026-06-01'::date, '2036-05-31'::date, true)
) AS v
WHERE NOT EXISTS (SELECT 1 FROM "atp_series" WHERE "tenantId" = '10000000-0000-0000-0000-000000000001'::uuid);

-- PHP denomination set for float declaration / cash counting
INSERT INTO "denomination_sets" ("id", "tenantId", "currency", "denominations", "isActive")
SELECT 'e4000000-0000-0000-0000-000000000001'::uuid,
       '10000000-0000-0000-0000-000000000001'::uuid,
       'PHP',
       '1000,500,200,100,50,20,10,5,1',
       true
WHERE NOT EXISTS (SELECT 1 FROM "denomination_sets" WHERE "tenantId" = '10000000-0000-0000-0000-000000000001'::uuid);

-- Curricula: enrollments require curriculumId (NOT NULL), but the Phase 3
-- seed never created any — the enrollment → invoice → payment chain was
-- severed at the very first link. One curriculum per education level for
-- the active school year.
INSERT INTO "curricula" ("id", "tenantId", "educationLevelId", "schoolYearId", "versionLabel", "status")
SELECT
  ('ec000000-0000-0000-0000-0000000' || lpad((row_number() OVER (ORDER BY el."createdAt"))::text, 5, '0'))::uuid,
  el."tenantId",
  el."id",
  sy."id",
  sy.name || ' v1',
  'active'
FROM "education_levels" el
CROSS JOIN LATERAL (
  SELECT "id", name FROM "school_years"
  WHERE "tenantId" = el."tenantId" AND status = 'active'
  ORDER BY "createdAt" LIMIT 1
) sy
WHERE NOT EXISTS (
  SELECT 1 FROM "curricula" c
  WHERE c."tenantId" = el."tenantId"
    AND c."educationLevelId" = el."id"
    AND c."schoolYearId" = sy."id"
);

COMMIT;
