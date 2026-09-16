-- 022: Attribution for scheduled report subscriptions.
--
-- ScheduledReportDispatcher stamps notifications with the subscription's
-- creator (notification_logs.recipientUserId is nullable, so a missing
-- creator is fine). Dev servers get the column from synchronize:true; this
-- migration provisions it everywhere else (and on fresh databases built
-- purely from migrations).

ALTER TABLE "scheduled_reports"
  ADD COLUMN IF NOT EXISTS "createdBy" uuid NULL;
