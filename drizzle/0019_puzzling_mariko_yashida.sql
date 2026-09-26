ALTER TABLE "course_reporting_defaults" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "courses" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "course_reporting_defaults" CASCADE;--> statement-breakpoint
DROP TABLE "courses" CASCADE;--> statement-breakpoint
DROP INDEX "classes_course_idx";--> statement-breakpoint
ALTER TABLE "classes" DROP COLUMN "course_id";
