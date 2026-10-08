ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_ffn_format";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_archived_state";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_archived_state" CHECK ("users"."archived_at" is null or not "users"."is_active");--> statement-breakpoint
UPDATE "users" SET "ffn" = replace("ffn", '-', '') WHERE "ffn" ~ '^[0-9]{4}-[0-9]{4}$';--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_ffn_format" CHECK ("users"."ffn" is null or "users"."ffn" ~ '^[0-9]+$');
