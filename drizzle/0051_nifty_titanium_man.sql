CREATE TABLE "revision_attestations" (
	"revision_id" uuid NOT NULL,
	"scope" text NOT NULL,
	"signed_by_user_id" uuid NOT NULL,
	"signed_by_name" text NOT NULL,
	"signed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"attestation_version" text NOT NULL,
	CONSTRAINT "revision_attestations_revision_id_scope_pk" PRIMARY KEY("revision_id","scope"),
	CONSTRAINT "revision_attestations_scope" CHECK ("revision_attestations"."scope" in ('roster', 'fire')),
	CONSTRAINT "revision_attestations_name_not_blank" CHECK (length(btrim("revision_attestations"."signed_by_name")) > 0),
	CONSTRAINT "revision_attestations_version_not_blank" CHECK (length(btrim("revision_attestations"."attestation_version")) > 0)
);
--> statement-breakpoint
ALTER TABLE "revision_attestations" ADD CONSTRAINT "revision_attestations_revision_id_finalization_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."finalization_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision_attestations" ADD CONSTRAINT "revision_attestations_signed_by_user_id_users_id_fk" FOREIGN KEY ("signed_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
INSERT INTO "revision_attestations" ("revision_id", "scope", "signed_by_user_id", "signed_by_name", "signed_at", "attestation_version")
SELECT "id", 'roster', "signed_by_user_id", "signed_by_name", "signed_at", "attestation_version"
FROM "finalization_revisions"
WHERE "signed_by_user_id" IS NOT NULL
  AND "signed_by_name" IS NOT NULL
  AND "signed_at" IS NOT NULL
  AND "attestation_version" IS NOT NULL
ON CONFLICT ("revision_id", "scope") DO NOTHING;--> statement-breakpoint
INSERT INTO "revision_attestations" ("revision_id", "scope", "signed_by_user_id", "signed_by_name", "signed_at", "attestation_version")
SELECT "revision_id", 'fire', "signed_by_user_id", "signed_by_name", "signed_at", "attestation_version"
FROM "finalization_fire_attestations"
ON CONFLICT ("revision_id", "scope") DO NOTHING;--> statement-breakpoint
INSERT INTO "revision_attestations" ("revision_id", "scope", "signed_by_user_id", "signed_by_name", "signed_at", "attestation_version")
SELECT revision."id", 'fire', revision."signed_by_user_id", revision."signed_by_name", revision."signed_at", revision."attestation_version"
FROM "finalization_revisions" revision
WHERE revision."signed_by_user_id" IS NOT NULL
  AND revision."signed_by_name" IS NOT NULL
  AND revision."signed_at" IS NOT NULL
  AND revision."attestation_version" IS NOT NULL
  AND revision."fire_signer_user_id" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "class_reporting_systems" class_system
    JOIN "reporting_systems" system ON system."id" = class_system."reporting_system_id"
    WHERE class_system."class_id" = revision."class_id" AND system."code" = 'fire'
  )
  AND NOT EXISTS (
    SELECT 1 FROM "revision_attestations" existing
    WHERE existing."revision_id" = revision."id" AND existing."scope" = 'fire'
  )
ON CONFLICT ("revision_id", "scope") DO NOTHING;--> statement-breakpoint
CREATE RULE "revision_attestations_no_update" AS ON UPDATE TO "revision_attestations" DO INSTEAD NOTHING;--> statement-breakpoint
CREATE RULE "revision_attestations_no_delete" AS ON DELETE TO "revision_attestations" DO INSTEAD NOTHING;