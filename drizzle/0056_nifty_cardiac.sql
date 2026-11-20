ALTER TABLE "class_instructors" ADD COLUMN "is_assistant" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- The unique index below rejects ambiguous legacy teams and rolls back the backfill.
UPDATE "class_instructors" SET "is_assistant" = true WHERE NOT "is_lead";--> statement-breakpoint
CREATE UNIQUE INDEX "class_instructors_assistant_unique" ON "class_instructors" USING btree ("class_id") WHERE "class_instructors"."is_assistant";--> statement-breakpoint
ALTER TABLE "class_instructors" ADD CONSTRAINT "class_instructors_roles_exclusive" CHECK (not ("class_instructors"."is_lead" and "class_instructors"."is_assistant"));
