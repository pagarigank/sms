-- 023: Seed `scheduled_report` notification templates + rules.
--
-- ScheduledReportDispatcher dispatches summaries with eventType
-- 'scheduled_report'. CommunicationsService.dispatch only sends when an
-- active notification_rule bridges the eventType to a template, so existing
-- tenants need both seeded (010 seeded templates only for
-- attendance_absence/low_balance; 019 added their rules).
--
-- Email is the only channel: report summaries target subscriber inboxes,
-- and subscription recipients are email addresses.

INSERT INTO "notification_templates" ("tenantId", "name", "eventType", "channel", "subject", "bodyTemplate", "isActive")
SELECT t.id,
       'Scheduled Report Summary',
       'scheduled_report',
       'email',
       'Scheduled report: {{reportName}}',
       E'Scheduled report {{reportName}} ({{reportType}}) — {{date}}\n\n{{summary}}',
       true
FROM "tenants" t
WHERE t."status" = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM "notification_templates" nt
    WHERE nt."tenantId" = t.id
      AND nt."eventType" = 'scheduled_report'
      AND nt."channel" = 'email'
  );

INSERT INTO "notification_rules" ("tenantId", "eventType", "threshold", "templateId", "isActive")
SELECT t."tenantId", t."eventType", '{}'::jsonb, t.id, true
FROM "notification_templates" t
WHERE t."eventType" = 'scheduled_report'
  AND NOT EXISTS (
    SELECT 1 FROM "notification_rules" r
    WHERE r."tenantId" = t."tenantId"
      AND r."eventType" = t."eventType"
      AND r."templateId" = t.id
  );

-- Also seed the system report templates subscriptions reference. No
-- report_templates were ever seeded (the dispatcher supports these three
-- reportTypes). reportType is a jsonb-typed column holding a scalar string —
-- to_jsonb(text) stores exactly what TypeORM's string mapping reads back.
INSERT INTO "report_templates" ("tenantId", "name", "reportType", "config", "description", "isSystem", "isActive")
SELECT t.id, v.name, to_jsonb(v.report_type::text), '{}'::jsonb, v.description, true, true
FROM "tenants" t
CROSS JOIN (VALUES
  ('Enrollment Statistics', 'enrollment_stats', 'Enrollment counts by status'),
  ('Revenue Summary', 'revenue', 'Collections by payment method (all-time)'),
  ('AR Aging Snapshot', 'ar_aging', 'Outstanding balances by age bracket')
) AS v(name, report_type, description)
WHERE t."status" = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM "report_templates" rt
    WHERE rt."tenantId" = t.id AND rt."name" = v.name
  );
