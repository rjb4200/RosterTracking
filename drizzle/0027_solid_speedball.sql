CREATE TABLE "email_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template" text NOT NULL,
	"template_version" text NOT NULL,
	"reference_type" text NOT NULL,
	"reference_id" uuid NOT NULL,
	"attendance_id" uuid,
	"recipient" text NOT NULL,
	"sender" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"content_fingerprint" text NOT NULL,
	"provider_message_id" text,
	"failure_reason" text,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_deliveries_status_valid" CHECK ("email_deliveries"."status" in ('queued', 'sent', 'failed', 'skipped')),
	CONSTRAINT "email_deliveries_attempt_count_nonnegative" CHECK ("email_deliveries"."attempt_count" >= 0),
	CONSTRAINT "email_deliveries_recipient_not_blank" CHECK (length(btrim("email_deliveries"."recipient")) > 0),
	CONSTRAINT "email_deliveries_sender_not_blank" CHECK (length(btrim("email_deliveries"."sender")) > 0),
	CONSTRAINT "email_deliveries_fingerprint_not_blank" CHECK (length(btrim("email_deliveries"."content_fingerprint")) > 0)
);
--> statement-breakpoint
ALTER TABLE "class_guests" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_deliveries_attendance_id_attendance_id_fk" FOREIGN KEY ("attendance_id") REFERENCES "public"."attendance"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "email_deliveries_reference_attendance_template_unique" ON "email_deliveries" USING btree ("reference_id","attendance_id","template");--> statement-breakpoint
CREATE INDEX "email_deliveries_reference_idx" ON "email_deliveries" USING btree ("reference_id");--> statement-breakpoint
CREATE INDEX "email_deliveries_attendance_status_idx" ON "email_deliveries" USING btree ("attendance_id","status");--> statement-breakpoint
CREATE INDEX "email_deliveries_status_idx" ON "email_deliveries" USING btree ("status","created_at");