UPDATE "classes" SET "status" = 'cancelled', "cancellation_reason" = 'Migrated from draft' WHERE "status" = 'draft';--> statement-breakpoint
ALTER TABLE "classes" DROP CONSTRAINT "classes_status";--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_status" CHECK ("classes"."status" in ('open', 'completed', 'finalized', 'cancelled'));
