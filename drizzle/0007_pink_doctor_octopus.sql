ALTER TABLE "attendance" DROP CONSTRAINT "attendance_credited_hours_nonnegative";--> statement-breakpoint
ALTER TABLE "attendance" ALTER COLUMN "credited_hours" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_credited_hours_nonnegative" CHECK ("attendance"."credited_hours" >= 0);