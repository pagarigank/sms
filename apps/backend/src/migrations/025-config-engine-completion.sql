-- 025: Config-engine completion — invoice-number integrity + tenant workflow defs.
--
-- Two gaps from the FR-CFG audit:
--
-- 1. Invoice numbers used to be minted from a non-transactional COUNT(*)
--    (INV-{count+1}), which duplicates under concurrency. The number is now
--    allocated from numbering_schemes inside the invoice transaction; this
--    backstop makes any residual collision a hard DB error instead of silent
--    duplicate AR references. Scoped per tenant (numbering is per-tenant).
--
-- 2. The seeded workflow_definitions (migration 004b) belong to the zero-GUID
--    permission-catalog tenant, so startWorkflow for any REAL tenant 400s
--    ("No active workflow") and FR-CFG-4 consumers (refund approval) silently
--    fall back. Seed the same four chains for existing real tenants.

-- 1) Unique invoice numbers per tenant (existing dupes would make the index
--    fail — de-duplicate defensively first, keeping the earliest).
UPDATE invoices i
SET    "invoiceNumber" = i."invoiceNumber" || '-D' || i."id"
FROM   invoices d
WHERE  i."tenantId" = d."tenantId"
  AND  i."invoiceNumber" = d."invoiceNumber"
  AND  i."invoiceNumber" IS NOT NULL
  AND  i."id" <> d."id"
  AND  i."createdAt" > d."createdAt";

CREATE UNIQUE INDEX IF NOT EXISTS "UQ_invoices_tenant_invoiceNumber"
  ON "invoices" ("tenantId", "invoiceNumber")
  WHERE "invoiceNumber" IS NOT NULL;

-- 2) Real-tenant workflow definitions (same shapes as the 004b catalog seed).
INSERT INTO workflow_definitions ("id", "tenantId", "entityType", name, description, steps, "slaHours", "escalationTo")
SELECT ('c2000000-0000-0000-0000-0000000000' || LPAD((ROW_NUMBER() OVER (ORDER BY t."tenantId"))::text, 2, '0'))::uuid,
       t."tenantId", w."entityType", w.name, w.description, w.steps, w."slaHours", w."escalationTo"
FROM   (SELECT DISTINCT "tenantId" FROM users WHERE "tenantId" <> '00000000-0000-0000-0000-000000000000') t
CROSS JOIN LATERAL (
  SELECT * FROM workflow_definitions
  WHERE "tenantId" = '00000000-0000-0000-0000-000000000000'
    AND "entityType" IN ('refund', 'grade_change', 'discount', 'document_release')
) w
WHERE NOT EXISTS (
  SELECT 1 FROM workflow_definitions x
  WHERE x."tenantId" = t."tenantId" AND x."entityType" = w."entityType" AND x."isActive" = true
);
