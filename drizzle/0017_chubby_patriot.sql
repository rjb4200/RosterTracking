ALTER TABLE "classes" ADD COLUMN "course_type" text;--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "course_number" text;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_course_type" CHECK ("classes"."course_type" is null or "classes"."course_type" in ('continuing_education', 'initial_certification', 'refresher'));--> statement-breakpoint
UPDATE "classes" SET "course_type" = 'continuing_education' WHERE "course_type" IS NULL;