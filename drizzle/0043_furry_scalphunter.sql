DROP INDEX "training_codes_code_revision_unique";--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "ems_category_id" uuid;--> statement-breakpoint
ALTER TABLE "training_codes" ADD COLUMN "kind" text DEFAULT 'fire' NOT NULL;--> statement-breakpoint
ALTER TABLE "training_codes" ADD COLUMN "category_group" text;--> statement-breakpoint
ALTER TABLE "training_codes" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "training_codes" ADD COLUMN "maps_to_id" uuid;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_ems_category_id_training_codes_id_fk" FOREIGN KEY ("ems_category_id") REFERENCES "public"."training_codes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_codes" ADD CONSTRAINT "training_codes_maps_to_id_fk" FOREIGN KEY ("maps_to_id") REFERENCES "public"."training_codes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "training_codes_kind_code_revision_unique" ON "training_codes" USING btree ("kind","code","source_revision");--> statement-breakpoint
CREATE INDEX "training_codes_kind_idx" ON "training_codes" USING btree ("kind");--> statement-breakpoint
ALTER TABLE "training_codes" ADD CONSTRAINT "training_codes_kind" CHECK ("training_codes"."kind" in ('fire', 'ems'));--> statement-breakpoint
ALTER TABLE "training_codes" ADD CONSTRAINT "training_codes_category_group" CHECK ("training_codes"."category_group" is null or "training_codes"."kind" = 'ems');