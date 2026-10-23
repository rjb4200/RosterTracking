ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_ffn_format";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_ffn_format" CHECK ("users"."ffn" is null or "users"."ffn" ~ '^([0-9]+|[0-9]{4}-[0-9]{4})$');
