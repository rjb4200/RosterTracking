CREATE TABLE "finalization_fire_attestations" (
	"revision_id" uuid PRIMARY KEY NOT NULL,
	"signed_by_user_id" uuid NOT NULL,
	"signed_by_name" text NOT NULL,
	"signed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"attestation_version" text NOT NULL,
	CONSTRAINT "finalization_fire_attestations_name_not_blank" CHECK (length(btrim("finalization_fire_attestations"."signed_by_name")) > 0),
	CONSTRAINT "finalization_fire_attestations_version_not_blank" CHECK (length(btrim("finalization_fire_attestations"."attestation_version")) > 0)
);
--> statement-breakpoint
ALTER TABLE "finalization_revisions" DROP CONSTRAINT "finalization_revisions_fire_attestation_complete";--> statement-breakpoint
ALTER TABLE "finalization_revisions" DROP CONSTRAINT "finalization_revisions_fire_signed_by_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "finalization_fire_attestations" ADD CONSTRAINT "finalization_fire_attestations_revision_id_finalization_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."finalization_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finalization_fire_attestations" ADD CONSTRAINT "finalization_fire_attestations_signed_by_user_id_users_id_fk" FOREIGN KEY ("signed_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finalization_revisions" DROP COLUMN "fire_signed_by_user_id";--> statement-breakpoint
ALTER TABLE "finalization_revisions" DROP COLUMN "fire_signed_by_name";--> statement-breakpoint
ALTER TABLE "finalization_revisions" DROP COLUMN "fire_signed_at";--> statement-breakpoint
ALTER TABLE "finalization_revisions" DROP COLUMN "fire_attestation_version";--> statement-breakpoint
CREATE RULE "finalization_fire_attestations_no_update" AS ON UPDATE TO "finalization_fire_attestations" DO INSTEAD NOTHING;--> statement-breakpoint
CREATE RULE "finalization_fire_attestations_no_delete" AS ON DELETE TO "finalization_fire_attestations" DO INSTEAD NOTHING;
