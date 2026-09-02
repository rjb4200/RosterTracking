CREATE TABLE "attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"student_id" uuid,
	"guest_id" uuid,
	"agency_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"payload_fingerprint" text NOT NULL,
	"signed_in_at" timestamp with time zone DEFAULT now() NOT NULL,
	"removed_at" timestamp with time zone,
	"removed_by_user_id" uuid,
	"removal_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_participant_xor" CHECK (("attendance"."student_id" is not null) <> ("attendance"."guest_id" is not null)),
	CONSTRAINT "attendance_idempotency_not_blank" CHECK (length(btrim("attendance"."idempotency_key")) > 0),
	CONSTRAINT "attendance_payload_fingerprint_not_blank" CHECK (length(btrim("attendance"."payload_fingerprint")) > 0),
	CONSTRAINT "attendance_removal_fields" CHECK (("attendance"."removed_at" is null and "attendance"."removed_by_user_id" is null and "attendance"."removal_reason" is null) or ("attendance"."removed_at" is not null and "attendance"."removed_by_user_id" is not null and nullif(btrim("attendance"."removal_reason"), '') is not null)),
	CONSTRAINT "attendance_removed_after_sign_in" CHECK ("attendance"."removed_at" is null or "attendance"."removed_at" >= "attendance"."signed_in_at")
);
--> statement-breakpoint
CREATE TABLE "attendance_attestations" (
	"attendance_id" uuid PRIMARY KEY NOT NULL,
	"rendered_text" text NOT NULL,
	"text_version" integer NOT NULL,
	"confirmed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sign_in_method" text NOT NULL,
	"originating_ip" text NOT NULL,
	"request_source_fingerprint" text NOT NULL,
	"request_correlation_id" text NOT NULL,
	"remembered_device_id" uuid,
	CONSTRAINT "attendance_attestations_text_not_blank" CHECK (length(btrim("attendance_attestations"."rendered_text")) > 0),
	CONSTRAINT "attendance_attestations_text_version_positive" CHECK ("attendance_attestations"."text_version" > 0),
	CONSTRAINT "attendance_attestations_method_not_blank" CHECK (length(btrim("attendance_attestations"."sign_in_method")) > 0),
	CONSTRAINT "attendance_attestations_ip_not_blank" CHECK (length(btrim("attendance_attestations"."originating_ip")) > 0),
	CONSTRAINT "attendance_attestations_source_not_blank" CHECK (length(btrim("attendance_attestations"."request_source_fingerprint")) > 0),
	CONSTRAINT "attendance_attestations_correlation_not_blank" CHECK (length(btrim("attendance_attestations"."request_correlation_id")) > 0)
);
--> statement-breakpoint
CREATE TABLE "attendance_credential_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attendance_id" uuid NOT NULL,
	"requirement_set_id" uuid NOT NULL,
	"credential_type_id" uuid NOT NULL,
	"encrypted_value" text NOT NULL,
	"masked_suffix" text NOT NULL,
	CONSTRAINT "attendance_credential_snapshots_value_not_blank" CHECK (length(btrim("attendance_credential_snapshots"."encrypted_value")) > 0),
	CONSTRAINT "attendance_credential_snapshots_suffix_not_blank" CHECK (length(btrim("attendance_credential_snapshots"."masked_suffix")) > 0)
);
--> statement-breakpoint
CREATE TABLE "attendance_reporting_contexts" (
	"attendance_id" uuid NOT NULL,
	"requirement_set_id" uuid NOT NULL,
	CONSTRAINT "attendance_reporting_contexts_attendance_id_requirement_set_id_pk" PRIMARY KEY("attendance_id","requirement_set_id")
);
--> statement-breakpoint
CREATE TABLE "attendance_required_field_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attendance_id" uuid NOT NULL,
	"requirement_set_id" uuid NOT NULL,
	"student_field" text NOT NULL,
	"encrypted_value" text NOT NULL,
	CONSTRAINT "attendance_required_field_snapshots_field_not_blank" CHECK (length(btrim("attendance_required_field_snapshots"."student_field")) > 0),
	CONSTRAINT "attendance_required_field_snapshots_value_not_blank" CHECK (length(btrim("attendance_required_field_snapshots"."encrypted_value")) > 0)
);
--> statement-breakpoint
CREATE TABLE "class_guests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "class_guests_id_class_unique" UNIQUE("id","class_id"),
	CONSTRAINT "class_guests_first_name_not_blank" CHECK (length(btrim("class_guests"."first_name")) > 0),
	CONSTRAINT "class_guests_last_name_not_blank" CHECK (length(btrim("class_guests"."last_name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "public_rate_limit_windows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"operation" text NOT NULL,
	"request_source_fingerprint" text NOT NULL,
	"identifier_fingerprint" text NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "public_rate_limit_windows_operation_not_blank" CHECK (length(btrim("public_rate_limit_windows"."operation")) > 0),
	CONSTRAINT "public_rate_limit_windows_source_not_blank" CHECK (length(btrim("public_rate_limit_windows"."request_source_fingerprint")) > 0),
	CONSTRAINT "public_rate_limit_windows_identifier_not_blank" CHECK (length(btrim("public_rate_limit_windows"."identifier_fingerprint")) > 0),
	CONSTRAINT "public_rate_limit_windows_expiration" CHECK ("public_rate_limit_windows"."expires_at" > "public_rate_limit_windows"."window_started_at"),
	CONSTRAINT "public_rate_limit_windows_counts_nonnegative" CHECK ("public_rate_limit_windows"."attempt_count" >= 0 and "public_rate_limit_windows"."failure_count" >= 0 and "public_rate_limit_windows"."failure_count" <= "public_rate_limit_windows"."attempt_count")
);
--> statement-breakpoint
CREATE TABLE "remembered_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"last_used_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "remembered_devices_token_hash_not_blank" CHECK (length(btrim("remembered_devices"."token_hash")) > 0),
	CONSTRAINT "remembered_devices_expiration_after_creation" CHECK ("remembered_devices"."expires_at" > "remembered_devices"."created_at"),
	CONSTRAINT "remembered_devices_last_used_after_creation" CHECK ("remembered_devices"."last_used_at" is null or "remembered_devices"."last_used_at" >= "remembered_devices"."created_at"),
	CONSTRAINT "remembered_devices_revoked_after_creation" CHECK ("remembered_devices"."revoked_at" is null or "remembered_devices"."revoked_at" >= "remembered_devices"."created_at")
);
--> statement-breakpoint
CREATE TABLE "sign_in_workflow_staging" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"nonce_hash" text NOT NULL,
	"sign_in_token_version" integer NOT NULL,
	"idempotency_key" text NOT NULL,
	"encrypted_state" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sign_in_workflow_staging_nonce_not_blank" CHECK (length(btrim("sign_in_workflow_staging"."nonce_hash")) > 0),
	CONSTRAINT "sign_in_workflow_staging_idempotency_not_blank" CHECK (length(btrim("sign_in_workflow_staging"."idempotency_key")) > 0),
	CONSTRAINT "sign_in_workflow_staging_encrypted_state_not_blank" CHECK (length(btrim("sign_in_workflow_staging"."encrypted_state")) > 0),
	CONSTRAINT "sign_in_workflow_staging_token_version_positive" CHECK ("sign_in_workflow_staging"."sign_in_token_version" > 0),
	CONSTRAINT "sign_in_workflow_staging_expiration_after_creation" CHECK ("sign_in_workflow_staging"."expires_at" > "sign_in_workflow_staging"."created_at"),
	CONSTRAINT "sign_in_workflow_staging_consumed_after_creation" CHECK ("sign_in_workflow_staging"."consumed_at" is null or "sign_in_workflow_staging"."consumed_at" >= "sign_in_workflow_staging"."created_at")
);
--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "sign_in_token_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_removed_by_user_id_users_id_fk" FOREIGN KEY ("removed_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_guest_class_fk" FOREIGN KEY ("guest_id","class_id") REFERENCES "public"."class_guests"("id","class_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_attestations" ADD CONSTRAINT "attendance_attestations_attendance_id_attendance_id_fk" FOREIGN KEY ("attendance_id") REFERENCES "public"."attendance"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_attestations" ADD CONSTRAINT "attendance_attestations_remembered_device_id_remembered_devices_id_fk" FOREIGN KEY ("remembered_device_id") REFERENCES "public"."remembered_devices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_credential_snapshots" ADD CONSTRAINT "attendance_credential_snapshots_credential_type_id_credential_types_id_fk" FOREIGN KEY ("credential_type_id") REFERENCES "public"."credential_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_credential_snapshots" ADD CONSTRAINT "attendance_credential_snapshots_context_fk" FOREIGN KEY ("attendance_id","requirement_set_id") REFERENCES "public"."attendance_reporting_contexts"("attendance_id","requirement_set_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_reporting_contexts" ADD CONSTRAINT "attendance_reporting_contexts_attendance_id_attendance_id_fk" FOREIGN KEY ("attendance_id") REFERENCES "public"."attendance"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_reporting_contexts" ADD CONSTRAINT "attendance_reporting_contexts_requirement_set_id_reporting_requirement_sets_id_fk" FOREIGN KEY ("requirement_set_id") REFERENCES "public"."reporting_requirement_sets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_required_field_snapshots" ADD CONSTRAINT "attendance_required_field_snapshots_context_fk" FOREIGN KEY ("attendance_id","requirement_set_id") REFERENCES "public"."attendance_reporting_contexts"("attendance_id","requirement_set_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_guests" ADD CONSTRAINT "class_guests_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_rate_limit_windows" ADD CONSTRAINT "public_rate_limit_windows_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remembered_devices" ADD CONSTRAINT "remembered_devices_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sign_in_workflow_staging" ADD CONSTRAINT "sign_in_workflow_staging_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_class_idempotency_unique" ON "attendance" USING btree ("class_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_active_class_student_unique" ON "attendance" USING btree ("class_id","student_id") WHERE "attendance"."removed_at" is null and "attendance"."student_id" is not null;--> statement-breakpoint
CREATE INDEX "attendance_class_signed_in_idx" ON "attendance" USING btree ("class_id","signed_in_at");--> statement-breakpoint
CREATE INDEX "attendance_student_idx" ON "attendance" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "attendance_guest_idx" ON "attendance" USING btree ("guest_id");--> statement-breakpoint
CREATE INDEX "attendance_agency_idx" ON "attendance" USING btree ("agency_id");--> statement-breakpoint
CREATE INDEX "attendance_removed_idx" ON "attendance" USING btree ("class_id","removed_at");--> statement-breakpoint
CREATE INDEX "attendance_attestations_remembered_device_idx" ON "attendance_attestations" USING btree ("remembered_device_id");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_credential_snapshots_value_unique" ON "attendance_credential_snapshots" USING btree ("attendance_id","requirement_set_id","credential_type_id");--> statement-breakpoint
CREATE INDEX "attendance_credential_snapshots_attendance_idx" ON "attendance_credential_snapshots" USING btree ("attendance_id");--> statement-breakpoint
CREATE INDEX "attendance_credential_snapshots_type_idx" ON "attendance_credential_snapshots" USING btree ("credential_type_id");--> statement-breakpoint
CREATE INDEX "attendance_reporting_contexts_requirement_set_idx" ON "attendance_reporting_contexts" USING btree ("requirement_set_id");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_required_field_snapshots_value_unique" ON "attendance_required_field_snapshots" USING btree ("attendance_id","requirement_set_id","student_field");--> statement-breakpoint
CREATE INDEX "attendance_required_field_snapshots_attendance_idx" ON "attendance_required_field_snapshots" USING btree ("attendance_id");--> statement-breakpoint
CREATE INDEX "class_guests_class_name_idx" ON "class_guests" USING btree ("class_id","last_name","first_name");--> statement-breakpoint
CREATE UNIQUE INDEX "public_rate_limit_windows_key_unique" ON "public_rate_limit_windows" USING btree ("class_id","operation","request_source_fingerprint","identifier_fingerprint","window_started_at");--> statement-breakpoint
CREATE INDEX "public_rate_limit_windows_expires_idx" ON "public_rate_limit_windows" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "public_rate_limit_windows_source_idx" ON "public_rate_limit_windows" USING btree ("class_id","operation","request_source_fingerprint","window_started_at");--> statement-breakpoint
CREATE INDEX "public_rate_limit_windows_identifier_idx" ON "public_rate_limit_windows" USING btree ("class_id","operation","identifier_fingerprint","window_started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "remembered_devices_token_hash_unique" ON "remembered_devices" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "remembered_devices_student_idx" ON "remembered_devices" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "remembered_devices_expires_idx" ON "remembered_devices" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "remembered_devices_student_active_idx" ON "remembered_devices" USING btree ("student_id","expires_at") WHERE "remembered_devices"."revoked_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "sign_in_workflow_staging_nonce_hash_unique" ON "sign_in_workflow_staging" USING btree ("nonce_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "sign_in_workflow_staging_class_idempotency_unique" ON "sign_in_workflow_staging" USING btree ("class_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "sign_in_workflow_staging_expires_idx" ON "sign_in_workflow_staging" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "sign_in_workflow_staging_class_idx" ON "sign_in_workflow_staging" USING btree ("class_id","expires_at");--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_sign_in_token_version_positive" CHECK ("classes"."sign_in_token_version" > 0);