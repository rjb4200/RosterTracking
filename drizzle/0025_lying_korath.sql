ALTER TABLE "finalization_revisions" ADD COLUMN "signed_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "finalization_revisions" ADD COLUMN "signed_by_name" text;--> statement-breakpoint
ALTER TABLE "finalization_revisions" ADD COLUMN "signed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "finalization_revisions" ADD COLUMN "attestation_version" text;--> statement-breakpoint
ALTER TABLE "finalization_revisions" ADD CONSTRAINT "finalization_revisions_signed_by_user_id_users_id_fk" FOREIGN KEY ("signed_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;