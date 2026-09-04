ALTER TABLE "attendance" ADD COLUMN "credited_hours" numeric(5, 2);--> statement-breakpoint
UPDATE "attendance" SET "credited_hours" = COALESCE((SELECT SUM("credited_hours") FROM "class_components" WHERE "class_components"."class_id" = "attendance"."class_id"), 0) WHERE "credited_hours" IS NULL;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "credit_adjustment_reason" text;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "credit_adjusted_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "credit_adjusted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "is_manual" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "manual_recorded_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_credit_adjusted_by_user_id_users_id_fk" FOREIGN KEY ("credit_adjusted_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_manual_recorded_by_user_id_users_id_fk" FOREIGN KEY ("manual_recorded_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attendance_roster_active_idx" ON "attendance" USING btree ("class_id","signed_in_at") WHERE "attendance"."removed_at" is null;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_credited_hours_nonnegative" CHECK ("attendance"."credited_hours" is null or "attendance"."credited_hours" >= 0);--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_credit_adjustment_fields" CHECK (("attendance"."credit_adjustment_reason" is null and "attendance"."credit_adjusted_by_user_id" is null and "attendance"."credit_adjusted_at" is null) or (nullif(btrim("attendance"."credit_adjustment_reason"), '') is not null and "attendance"."credit_adjusted_by_user_id" is not null and "attendance"."credit_adjusted_at" is not null));--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_manual_fields" CHECK (("attendance"."is_manual" = false and "attendance"."manual_recorded_by_user_id" is null) or ("attendance"."is_manual" = true and "attendance"."manual_recorded_by_user_id" is not null));
