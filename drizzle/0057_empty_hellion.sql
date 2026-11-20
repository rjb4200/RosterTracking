ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mtu_instructor" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN IF NOT EXISTS "issue_internal_cert" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "training_codes" ADD COLUMN IF NOT EXISTS "external_cert_issuer" text;--> statement-breakpoint
ALTER TABLE "training_codes" DROP CONSTRAINT IF EXISTS "training_codes_external_cert_issuer";--> statement-breakpoint
ALTER TABLE "training_codes" ADD CONSTRAINT "training_codes_external_cert_issuer" CHECK ("training_codes"."external_cert_issuer" is null or "training_codes"."external_cert_issuer" in ('aha', 'naemt', 'other'));
