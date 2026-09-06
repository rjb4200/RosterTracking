CREATE TABLE "official_roster_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision_id" uuid NOT NULL,
	"form_type" text NOT NULL,
	"template_version" text NOT NULL,
	"object_key" text NOT NULL,
	"checksum" text NOT NULL,
	"byte_size" integer NOT NULL,
	"generated_by_user_id" uuid NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "official_roster_artifacts_form_type" CHECK ("official_roster_artifacts"."form_type" in ('kfs-1a', 'kbems-e16')),
	CONSTRAINT "official_roster_artifacts_object_key_not_blank" CHECK (length(btrim("official_roster_artifacts"."object_key")) > 0),
	CONSTRAINT "official_roster_artifacts_checksum_sha256" CHECK ("official_roster_artifacts"."checksum" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "official_roster_artifacts_byte_size_positive" CHECK ("official_roster_artifacts"."byte_size" > 0)
);
--> statement-breakpoint
ALTER TABLE "official_roster_artifacts" ADD CONSTRAINT "official_roster_artifacts_revision_id_finalization_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."finalization_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_roster_artifacts" ADD CONSTRAINT "official_roster_artifacts_generated_by_user_id_users_id_fk" FOREIGN KEY ("generated_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "official_roster_artifacts_object_key_unique" ON "official_roster_artifacts" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "official_roster_artifacts_revision_generated_idx" ON "official_roster_artifacts" USING btree ("revision_id","generated_at");
--> statement-breakpoint
CREATE RULE "official_roster_artifacts_no_update" AS ON UPDATE TO "official_roster_artifacts" DO INSTEAD NOTHING;
--> statement-breakpoint
CREATE RULE "official_roster_artifacts_no_delete" AS ON DELETE TO "official_roster_artifacts" DO INSTEAD NOTHING;
