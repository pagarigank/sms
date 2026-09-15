-- 019: Seed notification rules for the templates 010 created.
--
-- 010 seeded `notification_templates` for `attendance_absence` and
-- `low_balance` (sms + email variants) but no `notification_rules` rows.
-- The dispatcher (CommunicationsService.dispatch) only sends when an active
-- rule bridges an eventType to a template, so absence alerts never fired.
-- One rule per seeded template, per seeded tenant.

INSERT INTO "notification_rules" ("tenantId", "eventType", "threshold", "templateId", "isActive")
SELECT t."tenantId", t."eventType", '{}'::jsonb, t.id, true
FROM "notification_templates" t
WHERE t."eventType" IN ('attendance_absence', 'low_balance')
  AND NOT EXISTS (
    SELECT 1 FROM "notification_rules" r
    WHERE r."tenantId" = t."tenantId"
      AND r."eventType" = t."eventType"
      AND r."templateId" = t.id
  );
