ALTER TABLE "fee_structure_items" ADD COLUMN "isPerUnit" boolean DEFAULT false;
ALTER TABLE "invoices" ADD COLUMN "paymentPlanId" uuid;
ALTER TABLE "invoices" ADD CONSTRAINT "fk_invoices_payment_plan" FOREIGN KEY ("paymentPlanId") REFERENCES "payment_plans"("id") ON DELETE SET NULL;
