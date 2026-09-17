-- Migration to add year_level_id to curriculum_subjects
ALTER TABLE curriculum_subjects ADD COLUMN IF NOT EXISTS year_level_id UUID REFERENCES grade_levels(id) ON DELETE SET NULL;
