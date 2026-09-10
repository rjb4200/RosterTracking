ALTER TABLE "classes" ADD COLUMN "public_code" text;--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "access_pin_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "access_pin_encrypted" text;--> statement-breakpoint
CREATE UNIQUE INDEX "classes_public_code_unique" ON "classes" USING btree ("public_code") WHERE "classes"."public_code" is not null;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_public_code_format" CHECK ("classes"."public_code" is null or "classes"."public_code" ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$');--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_access_pin_state" CHECK (("classes"."access_pin_enabled" and "classes"."access_pin_encrypted" is not null) or (not "classes"."access_pin_enabled" and "classes"."access_pin_encrypted" is null));