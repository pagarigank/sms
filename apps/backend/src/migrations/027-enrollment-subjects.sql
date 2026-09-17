CREATE TABLE IF NOT EXISTS enrollment_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  status VARCHAR(50) NOT NULL DEFAULT 'enrolled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policy
ALTER TABLE enrollment_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_enrollment_subjects ON enrollment_subjects 
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
