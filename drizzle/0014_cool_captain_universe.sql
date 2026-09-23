ALTER TABLE "users" ADD COLUMN "ffn" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "instructor_level" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ems_provider_number" text;--> statement-breakpoint
CREATE UNIQUE INDEX "users_ffn_unique" ON "users" USING btree ("ffn") WHERE "users"."ffn" is not null;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_ffn_format" CHECK ("users"."ffn" is null or "users"."ffn" ~ '^[0-9]{4}-[0-9]{4}$');--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_instructor_level_valid" CHECK ("users"."instructor_level" is null or "users"."instructor_level" in (1, 2, 3));