-- k12 payment plans
INSERT INTO "payment_plans" ("id", "tenantId", "name", "description", "numberOfInstallments", "cashDiscountPercentage", "installmentFee", "penaltyPercentage", "isActive")
SELECT * FROM (VALUES
  ('f3000000-0000-0000-0000-000000000005'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'Semi-Annual (K-12)', '2 installments', 2, 2, 0, 0, true),
  ('f3000000-0000-0000-0000-000000000006'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'Quarterly (K-12)', '4 installments', 4, 0, 0, 0, true)
) AS v
WHERE NOT EXISTS (
  SELECT 1 FROM "payment_plans" 
  WHERE "tenantId" = '10000000-0000-0000-0000-000000000001'::uuid 
  AND "id" IN ('f3000000-0000-0000-0000-000000000005'::uuid, 'f3000000-0000-0000-0000-000000000006'::uuid)
);
