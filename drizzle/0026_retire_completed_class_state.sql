ALTER TABLE "classes" DROP CONSTRAINT "classes_status";--> statement-breakpoint
-- Resume unfinished reviews as open work; never manufacture a lead signature.
UPDATE "classes" SET "status" = 'open', "updated_at" = now() WHERE "status" = 'completed';--> statement-breakpoint
ALTER TABLE "classes" DROP COLUMN "completed_at";--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_status" CHECK ("classes"."status" in ('open', 'finalized', 'cancelled'));
