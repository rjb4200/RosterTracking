ALTER TABLE "users" DROP CONSTRAINT "users_ffn_format";--> statement-breakpoint
ALTER TABLE "credential_types" ADD COLUMN "value_pattern" text;--> statement-breakpoint
UPDATE "credential_types" SET "value_pattern" = '^[0-9]{4}-[0-9]{4}$' WHERE "code" = 'ffn';--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_ffn_format" CHECK ("users"."ffn" is null or "users"."ffn" ~ '^([0-9]+|[0-9]{4}-[0-9]{4})$');
