DROP INDEX "email_deliveries_reference_attendance_template_unique";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "email_deliveries" ADD COLUMN "period" text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree (lower("email")) WHERE "users"."email" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "email_deliveries_reference_attendance_template_unique" ON "email_deliveries" USING btree ("reference_id","attendance_id","template","period");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_normalized" CHECK ("users"."email" is null or "users"."email" = lower(btrim("users"."email")));