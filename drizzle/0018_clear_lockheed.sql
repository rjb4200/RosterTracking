ALTER TABLE "classes" ADD COLUMN "name" text;--> statement-breakpoint
UPDATE "classes" c SET "name" = co."name" FROM "courses" co WHERE co."id" = c."course_id" AND c."name" IS NULL;