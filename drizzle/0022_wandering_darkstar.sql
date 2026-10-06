CREATE TABLE "curriculum_chapters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"curriculum_id" uuid NOT NULL,
	"part" text DEFAULT '' NOT NULL,
	"number" text NOT NULL,
	"title" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"source_revision" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "class_components" ADD COLUMN "curriculum_name" text;--> statement-breakpoint
ALTER TABLE "class_components" ADD COLUMN "curriculum_chapter" text;--> statement-breakpoint
ALTER TABLE "curriculum_chapters" ADD CONSTRAINT "curriculum_chapters_curriculum_id_curricula_id_fk" FOREIGN KEY ("curriculum_id") REFERENCES "public"."curricula"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "curriculum_chapters_identity_unique" ON "curriculum_chapters" USING btree ("curriculum_id","part","number");--> statement-breakpoint
CREATE INDEX "curriculum_chapters_curriculum_position_idx" ON "curriculum_chapters" USING btree ("curriculum_id","position");