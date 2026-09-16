-- 020: Normalize permanent_records.recordType from jsonb to varchar.
--
-- The column has always held a plain scalar string ('report_card',
-- 'Form 137', 'TOR') but was declared jsonb, so every value was stored as a
-- JSON scalar. The entity now declares a plain varchar with a 'report_card'
-- default; this converges the database and converts existing scalar values.
--
-- USING the expression is a no-op for jsonb scalars (jsonb #>> '{}' unwraps
-- the scalar to text). Non-scalar values (never written by the app) would
-- render as their JSON text, which is the same behavior a re-read would show.

ALTER TABLE "permanent_records"
  ALTER COLUMN "recordType" DROP DEFAULT;

-- Guard against exotic values before the type change: anything that is not a
-- JSON scalar becomes 'report_card'.
UPDATE "permanent_records"
SET "recordType" = '"report_card"'
WHERE jsonb_typeof("recordType") IS DISTINCT FROM 'string';

ALTER TABLE "permanent_records"
  ALTER COLUMN "recordType" TYPE character varying
  USING ("recordType" #>> '{}');

ALTER TABLE "permanent_records"
  ALTER COLUMN "recordType" SET DEFAULT 'report_card';

ALTER TABLE "permanent_records"
  ALTER COLUMN "recordType" SET NOT NULL;
