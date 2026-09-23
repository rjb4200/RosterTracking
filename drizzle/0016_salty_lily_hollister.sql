CREATE TABLE "curricula" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"publisher" text NOT NULL,
	"program_title" text NOT NULL,
	"version" text,
	"additional_requirements" text,
	"source_revision" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "class_components" ADD COLUMN "training_code_id" uuid;--> statement-breakpoint
ALTER TABLE "class_components" ADD COLUMN "class_name" text;--> statement-breakpoint
ALTER TABLE "class_components" ADD COLUMN "curriculum_id" uuid;--> statement-breakpoint
ALTER TABLE "class_components" ADD COLUMN "lesson_plan" text;--> statement-breakpoint
ALTER TABLE "class_components" ADD COLUMN "method" text;--> statement-breakpoint
CREATE UNIQUE INDEX "curricula_identity_unique" ON "curricula" USING btree ("publisher","program_title","source_revision");--> statement-breakpoint
CREATE INDEX "curricula_publisher_idx" ON "curricula" USING btree ("publisher");--> statement-breakpoint
ALTER TABLE "class_components" ADD CONSTRAINT "class_components_training_code_id_training_codes_id_fk" FOREIGN KEY ("training_code_id") REFERENCES "public"."training_codes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_components" ADD CONSTRAINT "class_components_curriculum_id_curricula_id_fk" FOREIGN KEY ("curriculum_id") REFERENCES "public"."curricula"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_components" ADD CONSTRAINT "class_components_method" CHECK ("class_components"."method" is null or "class_components"."method" in ('cr', 'ho', 'ol'));--> statement-breakpoint
UPDATE "class_components" AS cc
SET "class_name" = c."name",
    "training_code_id" = c."training_code_id"
FROM "classes" AS cl
JOIN "courses" AS c ON c."id" = cl."course_id"
WHERE cc."class_id" = cl."id"
  AND cc."class_name" IS NULL;