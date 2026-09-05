CREATE TABLE "finalization_reopens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision_id" uuid NOT NULL,
	"reopened_by_user_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"reopened_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "finalization_reopens_reason_not_blank" CHECK (length(btrim("finalization_reopens"."reason")) > 0)
);
--> statement-breakpoint
CREATE TABLE "finalization_reporting_statuses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision_id" uuid NOT NULL,
	"reporting_system_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reported_by_user_id" uuid,
	"reported_at" timestamp with time zone,
	"reference_number" text,
	"notes" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "finalization_reporting_status_valid" CHECK ("finalization_reporting_statuses"."status" in ('pending', 'reported', 'needs_correction'))
);
--> statement-breakpoint
CREATE TABLE "finalization_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"revision_number" integer NOT NULL,
	"finalized_by_user_id" uuid NOT NULL,
	"finalized_at" timestamp with time zone DEFAULT now() NOT NULL,
	"encrypted_snapshot" text NOT NULL,
	"summary" jsonb NOT NULL,
	CONSTRAINT "finalization_revisions_number_positive" CHECK ("finalization_revisions"."revision_number" > 0),
	CONSTRAINT "finalization_revisions_snapshot_not_blank" CHECK (length(btrim("finalization_revisions"."encrypted_snapshot")) > 0)
);
--> statement-breakpoint
ALTER TABLE "finalization_reopens" ADD CONSTRAINT "finalization_reopens_revision_id_finalization_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."finalization_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finalization_reopens" ADD CONSTRAINT "finalization_reopens_reopened_by_user_id_users_id_fk" FOREIGN KEY ("reopened_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finalization_reporting_statuses" ADD CONSTRAINT "finalization_reporting_statuses_revision_id_finalization_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."finalization_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finalization_reporting_statuses" ADD CONSTRAINT "finalization_reporting_statuses_reporting_system_id_reporting_systems_id_fk" FOREIGN KEY ("reporting_system_id") REFERENCES "public"."reporting_systems"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finalization_reporting_statuses" ADD CONSTRAINT "finalization_reporting_statuses_reported_by_user_id_users_id_fk" FOREIGN KEY ("reported_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finalization_revisions" ADD CONSTRAINT "finalization_revisions_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finalization_revisions" ADD CONSTRAINT "finalization_revisions_finalized_by_user_id_users_id_fk" FOREIGN KEY ("finalized_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "finalization_reopens_revision_unique" ON "finalization_reopens" USING btree ("revision_id");--> statement-breakpoint
CREATE UNIQUE INDEX "finalization_reporting_revision_system_unique" ON "finalization_reporting_statuses" USING btree ("revision_id","reporting_system_id");--> statement-breakpoint
CREATE INDEX "finalization_reporting_status_idx" ON "finalization_reporting_statuses" USING btree ("status","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "finalization_revisions_class_number_unique" ON "finalization_revisions" USING btree ("class_id","revision_number");--> statement-breakpoint
CREATE INDEX "finalization_revisions_class_finalized_idx" ON "finalization_revisions" USING btree ("class_id","finalized_at");
--> statement-breakpoint
CREATE RULE "finalization_revisions_no_update" AS ON UPDATE TO "finalization_revisions" DO INSTEAD NOTHING;
--> statement-breakpoint
CREATE RULE "finalization_revisions_no_delete" AS ON DELETE TO "finalization_revisions" DO INSTEAD NOTHING;
