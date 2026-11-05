CREATE TABLE "attendance_certificate_dispositions" (
	"attendance_id" uuid PRIMARY KEY NOT NULL,
	"decision" text NOT NULL,
	"note" text NOT NULL,
	"resolved_by_user_id" uuid NOT NULL,
	"resolved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_certificate_dispositions_decision" CHECK ("attendance_certificate_dispositions"."decision" in ('include', 'exclude')),
	CONSTRAINT "attendance_certificate_dispositions_note_not_blank" CHECK (length(btrim("attendance_certificate_dispositions"."note")) > 0)
);
--> statement-breakpoint
CREATE TABLE "attendance_check_ins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attendance_id" uuid NOT NULL,
	"check_in_date" date NOT NULL,
	"checked_in_at" timestamp with time zone DEFAULT now() NOT NULL,
	"rendered_text" text NOT NULL,
	"text_version" integer NOT NULL,
	"sign_in_method" text NOT NULL,
	"originating_ip" text NOT NULL,
	"request_source_fingerprint" text NOT NULL,
	"request_correlation_id" text NOT NULL,
	"remembered_device_id" uuid,
	CONSTRAINT "attendance_check_ins_text_not_blank" CHECK (length(btrim("attendance_check_ins"."rendered_text")) > 0),
	CONSTRAINT "attendance_check_ins_text_version_positive" CHECK ("attendance_check_ins"."text_version" > 0),
	CONSTRAINT "attendance_check_ins_method_not_blank" CHECK (length(btrim("attendance_check_ins"."sign_in_method")) > 0),
	CONSTRAINT "attendance_check_ins_ip_not_blank" CHECK (length(btrim("attendance_check_ins"."originating_ip")) > 0),
	CONSTRAINT "attendance_check_ins_source_not_blank" CHECK (length(btrim("attendance_check_ins"."request_source_fingerprint")) > 0),
	CONSTRAINT "attendance_check_ins_correlation_not_blank" CHECK (length(btrim("attendance_check_ins"."request_correlation_id")) > 0)
);
--> statement-breakpoint
ALTER TABLE "attendance_certificate_dispositions" ADD CONSTRAINT "attendance_certificate_dispositions_attendance_id_attendance_id_fk" FOREIGN KEY ("attendance_id") REFERENCES "public"."attendance"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_certificate_dispositions" ADD CONSTRAINT "attendance_certificate_dispositions_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_check_ins" ADD CONSTRAINT "attendance_check_ins_attendance_id_attendance_id_fk" FOREIGN KEY ("attendance_id") REFERENCES "public"."attendance"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_check_ins" ADD CONSTRAINT "attendance_check_ins_remembered_device_id_remembered_devices_id_fk" FOREIGN KEY ("remembered_device_id") REFERENCES "public"."remembered_devices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attendance_certificate_dispositions_resolver_idx" ON "attendance_certificate_dispositions" USING btree ("resolved_by_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_check_ins_attendance_date_unique" ON "attendance_check_ins" USING btree ("attendance_id","check_in_date");--> statement-breakpoint
CREATE INDEX "attendance_check_ins_date_idx" ON "attendance_check_ins" USING btree ("check_in_date");--> statement-breakpoint
CREATE INDEX "attendance_check_ins_attendance_idx" ON "attendance_check_ins" USING btree ("attendance_id");--> statement-breakpoint
CREATE INDEX "attendance_check_ins_remembered_device_idx" ON "attendance_check_ins" USING btree ("remembered_device_id");