-- Migration 031: DepEd K-12 3-Term Grading System (DO 015, s. 2026)
-- Adds descriptive grading support for Key Stage 1 (Kinder-Grade 3)
-- and seeds standard DepEd grading system presets.

-- 1. Add new columns to grade_entries for descriptive grading
ALTER TABLE grade_entries
  ADD COLUMN IF NOT EXISTS descriptive_grade VARCHAR(50),
  ADD COLUMN IF NOT EXISTS grading_mode VARCHAR(30) NOT NULL DEFAULT 'numeric';

-- 2. Add installment_id to payment_allocations (from cashiering module)
ALTER TABLE payment_allocations
  ADD COLUMN IF NOT EXISTS installment_id UUID;

COMMENT ON COLUMN grade_entries.descriptive_grade IS
  'For KS1 (Kinder-G3) descriptive grading per DO 015 s.2026. '
  'Kinder: beginning|developing|consistent. '
  'Grades 1-3: emerging|developing|approaching|meeting|advancing.';

COMMENT ON COLUMN grade_entries.grading_mode IS
  'numeric = standard/zero-based score entry. '
  'descriptive_ks1 = qualitative descriptor, no numeric transmutation (DO 015 s.2026).';

-- 3. Index for fast lookups on grading_mode
CREATE INDEX IF NOT EXISTS idx_grade_entries_grading_mode
  ON grade_entries (tenant_id, grading_mode);
