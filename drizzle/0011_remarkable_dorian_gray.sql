ALTER TABLE "finalization_reporting_statuses" DROP CONSTRAINT "finalization_reporting_status_valid";--> statement-breakpoint
UPDATE "finalization_reporting_statuses" SET "status" = 'entered' WHERE "status" = 'reported';--> statement-breakpoint
ALTER TABLE "finalization_reporting_statuses" ADD CONSTRAINT "finalization_reporting_status_valid" CHECK ("finalization_reporting_statuses"."status" in ('pending', 'entered', 'needs_correction', 'not_required'));
