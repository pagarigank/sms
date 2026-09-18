-- 034-grading-seed-snakecase.sql
-- Demo grading seed for the live (snake_case) grading schema.
--
-- Supersedes the broken 005-phase3-academic-seed.sql intent: 005 targeted
-- camelCase column names that 030 creates as snake_case (and 031's header
-- claims a seed but contains none), so nothing ever landed in the demo DB.
-- This migration fills grading_systems, grade_components and
-- honor_roll_configs with the DepEd K-12 demo configuration for the active
-- school year (a0000000-...-001 / S.Y. 2026-2027).
--
-- Reference IDs used elsewhere in the demo seed: tenant
-- 10000000-0000-0000-0000-000000000001, branches main/north
-- 20000000-...-001/-002, education levels f0000000-...-001..006.
-- All rows are tenant-defaults (branch_id NULL) per
-- docs/decisions/009-grading-system-active-resolution.md.
--
-- Idempotent: ON CONFLICT DO NOTHING on the PK.

-- ============================================================================
-- 1. grading_systems
-- ============================================================================
INSERT INTO grading_systems (id, tenant_id, branch_id, education_level_id, school_year_id, name, type, config, is_active)
VALUES
  -- Kindergarten (f...-001) — KS1 descriptive, qualitative only
  (
    'f1000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    NULL,
    'f0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Kindergarten — Descriptive (DO 015 s.2026)',
    'descriptive_ks1',
    '{"policyRef":"DO 015 s.2026","terms":2,"descriptorSet":"kindergarten","descriptors":[{"value":"beginning","label":"Beginning","shortLabel":"B"},{"value":"developing","label":"Developing","shortLabel":"D"},{"value":"consistent","label":"Consistent","shortLabel":"C"}],"noNumericGrade":true,"noHonorRoll":true,"note":"Qualitative assessment only. No numerical grades issued."}'::jsonb,
    true
  ),
  -- Elementary (f...-002) — G4-G6 zero-based numeric, WW/PT/QA
  (
    'f1000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    NULL,
    'f0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'Elementary — G4-G6 (DO 015 s.2026)',
    'numeric_zero_based',
    '{"policyRef":"DO 015 s.2026","terms":2,"passingGrade":75,"finalGradeMethod":"average_of_terms","noTransmutation":true,"gradeScale":[{"min":90,"label":"Outstanding"},{"min":85,"label":"Very Satisfactory"},{"min":80,"label":"Satisfactory"},{"min":75,"label":"Fairly Satisfactory"},{"min":null,"label":"Did Not Meet Expectations"}],"note":"Zero-based grading: raw percentage is the grade."}'::jsonb,
    true
  ),
  -- Junior HS (f...-003) — zero-based numeric, WW/PT/QA
  (
    'f1000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    NULL,
    'f0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'Junior HS — G7-G10 (DO 015 s.2026)',
    'numeric_zero_based',
    '{"policyRef":"DO 015 s.2026","terms":2,"passingGrade":75,"finalGradeMethod":"average_of_terms","noTransmutation":true,"gradeScale":[{"min":90,"label":"Outstanding"},{"min":85,"label":"Very Satisfactory"},{"min":80,"label":"Satisfactory"},{"min":75,"label":"Fairly Satisfactory"},{"min":null,"label":"Did Not Meet Expectations"}],"note":"Zero-based grading: raw percentage is the grade."}'::jsonb,
    true
  ),
  -- Senior HS (f...-004) — zero-based numeric, WW/PT/QA
  (
    'f1000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000001',
    NULL,
    'f0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000001',
    'Senior HS — G11-G12 (DO 015 s.2026)',
    'numeric_zero_based',
    '{"policyRef":"DO 015 s.2026","terms":2,"passingGrade":75,"finalGradeMethod":"average_of_terms","noTransmutation":true,"gradeScale":[{"min":90,"label":"Outstanding"},{"min":85,"label":"Very Satisfactory"},{"min":80,"label":"Satisfactory"},{"min":75,"label":"Fairly Satisfactory"},{"min":null,"label":"Did Not Meet Expectations"}],"note":"Zero-based grading: raw percentage is the grade."}'::jsonb,
    true
  ),
  -- College (f...-005) — numeric per credit units (GPA/pass_fail not yet implemented)
  (
    'f1000000-0000-0000-0000-000000000005',
    '10000000-0000-0000-0000-000000000001',
    NULL,
    'f0000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000001',
    'College — Numeric (DO 015 s.2026)',
    'numeric_zero_based',
    '{"policyRef":"DO 015 s.2026","terms":2,"passingGrade":75,"finalGradeMethod":"average_of_terms","noTransmutation":true,"gradeScale":[{"min":90,"label":"Outstanding"},{"min":85,"label":"Very Satisfactory"},{"min":80,"label":"Satisfactory"},{"min":75,"label":"Fairly Satisfactory"},{"min":null,"label":"Did Not Meet Expectations"}],"note":"Zero-based grading: raw percentage is the grade."}'::jsonb,
    true
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. grade_components — WW 25 / PT 50 / QA 25 for every numeric system
-- ============================================================================
INSERT INTO grade_components (id, tenant_id, grading_system_id, name, weight, "order")
VALUES
  -- Elementary (f1000000-...-002)
  ('f2000000-0000-0000-0000-000000000201', '10000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000002', 'Written Work (WW)', 25, 1),
  ('f2000000-0000-0000-0000-000000000202', '10000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000002', 'Performance Tasks (PT)', 50, 2),
  ('f2000000-0000-0000-0000-000000000203', '10000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000002', 'Quarterly Assessment (QA)', 25, 3),
  -- Junior HS (f1000000-...-003)
  ('f2000000-0000-0000-0000-000000000301', '10000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000003', 'Written Work (WW)', 25, 1),
  ('f2000000-0000-0000-0000-000000000302', '10000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000003', 'Performance Tasks (PT)', 50, 2),
  ('f2000000-0000-0000-0000-000000000303', '10000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000003', 'Quarterly Assessment (QA)', 25, 3),
  -- Senior HS (f1000000-...-004)
  ('f2000000-0000-0000-0000-000000000401', '10000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000004', 'Written Work (WW)', 25, 1),
  ('f2000000-0000-0000-0000-000000000402', '10000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000004', 'Performance Tasks (PT)', 50, 2),
  ('f2000000-0000-0000-0000-000000000403', '10000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000004', 'Quarterly Assessment (QA)', 25, 3),
  -- College (f1000000-...-005)
  ('f2000000-0000-0000-0000-000000000501', '10000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000005', 'Written Work (WW)', 25, 1),
  ('f2000000-0000-0000-0000-000000000502', '10000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000005', 'Performance Tasks (PT)', 50, 2),
  ('f2000000-0000-0000-0000-000000000503', '10000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000005', 'Quarterly Assessment (QA)', 25, 3)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. honor_roll_configs — Elementary / JHS / SHS only (DO 015: with honors bands)
-- ============================================================================
INSERT INTO honor_roll_configs (id, tenant_id, branch_id, education_level_id, school_year_id, with_honors_threshold, with_high_honors_threshold, with_highest_honors_threshold, is_active)
VALUES
  (
    'f3000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    NULL,
    'f0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    90, 95, 98,
    true
  ),
  (
    'f3000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    NULL,
    'f0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    90, 95, 98,
    true
  ),
  (
    'f3000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000001',
    NULL,
    'f0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000001',
    90, 95, 98,
    true
  )
ON CONFLICT (id) DO NOTHING;