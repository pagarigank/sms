-- ============================================================
-- 002b — Converge columns whose entity declared the wrong type
-- ============================================================
-- Twelve columns were annotated `@Column({ type: 'uuid', nullable: true })`
-- even though they hold numbers or free text. The deployed databases were
-- materialised by TypeORM `synchronize`, so those columns really are `uuid`
-- there — which is why the seeds in 009/011 failed with
-- `column "versionLabel" is of type uuid but expression is of type text`.
--
--   attendance_records.minutesLate       -> integer
--   attendance_records.periodNumber      -> integer
--   attendance_excuses.description       -> text
--   behavior_incidents.incidentLocation  -> varchar
--   curricula.versionLabel               -> varchar
--   curriculum_subjects.order            -> integer
--   fee_structures.templateKey           -> varchar
--   grade_change_requests.reason         -> text
--   grade_entries.remarks                -> text
--   health_records.title                 -> varchar
--   permanent_records.generalAverage     -> numeric(5,2)
--   subjects.description                 -> text
--
-- Numbered 002b rather than 018 because the seeder migrations (009, 011) insert
-- values into these columns: the corrections have to land before them.
-- A database built from 000-create-all-tables.sql already has the correct
-- types, so everything here is a no-op there. Idempotent.
-- ============================================================

-- The IdempotencyGuard lookup column (`SELECT id FROM idempotency_keys …`),
-- missing from the previously deployed table (keyed on `key` only).
ALTER TABLE idempotency_keys ADD COLUMN IF NOT EXISTS id uuid NOT NULL DEFAULT gen_random_uuid();

-- Conversions are driven by the current column type, so this is safe to re-run
-- and safe on a schema that is already correct. Values that cannot be cast (a
-- uuid rendered as text is not an integer) become NULL; these columns were
-- never populated in a deployed database.
DO $$
DECLARE
  r RECORD;
  target_type TEXT;
  base_type TEXT;
  conversion TEXT;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('attendance_records',    'minutesLate',      'integer'),
      ('attendance_records',    'periodNumber',     'integer'),
      ('attendance_excuses',    'description',      'text'),
      ('behavior_incidents',    'incidentLocation', 'character varying'),
      ('curricula',             'versionLabel',     'character varying'),
      ('curriculum_subjects',   'order',            'integer'),
      ('fee_structures',        'templateKey',      'character varying'),
      ('grade_change_requests', 'reason',           'text'),
      ('grade_entries',         'remarks',          'text'),
      ('health_records',        'title',            'character varying'),
      ('permanent_records',     'generalAverage',   'numeric(5,2)'),
      ('subjects',              'description',      'text'),
      ('user_person_links',     'personType',       'character varying(20)')
    ) AS v(tbl, col, target)
  LOOP
    -- information_schema reports the base type without the length/precision.
    base_type := split_part(r.target, '(', 1);

    -- Only touch columns that exist and are not already the target type.
    IF EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = r.tbl
        AND c.column_name = r.col
        AND c.data_type <> base_type
    ) THEN
      target_type := r.target;
      -- Numeric targets keep values that parse, everything else becomes text.
      IF r.target IN ('integer', 'numeric(5,2)') THEN
        conversion := format(
          'CASE WHEN %I::text ~ %L THEN %I::text::%s END',
          r.col,
          CASE WHEN r.target = 'integer' THEN '^-?[0-9]+$' ELSE '^-?[0-9]+(\.[0-9]+)?$' END,
          r.col,
          target_type
        );
      ELSE
        conversion := format('%I::text', r.col);
      END IF;

      EXECUTE format(
        'ALTER TABLE %I ALTER COLUMN %I TYPE %s USING %s',
        r.tbl,
        r.col,
        target_type,
        conversion
      );
      RAISE NOTICE '002b: %.% -> %', r.tbl, r.col, target_type;
    END IF;
  END LOOP;
END $$;

-- Stale index: before the named index was declared on Guardian.userId, TypeORM
-- `synchronize` created an anonymous one. 011 now creates 'idx_guardians_user'
-- with the same definition, so drop the leftover so schema comparisons settle.
DROP INDEX IF EXISTS "IDX_62de757629bae3df0b54c846a2";

-- Default-expression drift on faculty_load_limits.warnOnApproachPct: the entity
-- declared `default: 0.8`, which renders as the string literal '0.8' and never
-- matches the numeric default the database reports, so every schema comparison
-- flagged the column. The entity now uses the raw expression `() => '0.8'`;
-- align existing databases with the numeric literal.
DO $$
BEGIN
  IF (
    SELECT column_default FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'faculty_load_limits'
      AND column_name = 'warnOnApproachPct'
  ) IS DISTINCT FROM '0.8' THEN
    ALTER TABLE faculty_load_limits ALTER COLUMN "warnOnApproachPct" SET DEFAULT 0.8;
  END IF;
END $$;
