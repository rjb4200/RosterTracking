CREATE TABLE "class_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"title" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"credited_hours" numeric(5, 2) NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "class_components_time_range" CHECK ("class_components"."ends_at" > "class_components"."starts_at"),
	CONSTRAINT "class_components_hours_positive" CHECK ("class_components"."credited_hours" > 0)
);
--> statement-breakpoint
CREATE TABLE "class_instructors" (
	"class_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"is_lead" boolean DEFAULT false NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "class_instructors_class_id_user_id_pk" PRIMARY KEY("class_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "class_reporting_systems" (
	"class_id" uuid NOT NULL,
	"reporting_system_id" uuid NOT NULL,
	CONSTRAINT "class_reporting_systems_class_id_reporting_system_id_pk" PRIMARY KEY("class_id","reporting_system_id")
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"training_site_id" uuid,
	"created_by_user_id" uuid NOT NULL,
	"delivery_method" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"sign_in_token_hash" text NOT NULL,
	"cancellation_reason" text,
	"opened_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "classes_delivery_method" CHECK ("classes"."delivery_method" in ('in_person', 'virtual', 'hybrid')),
	CONSTRAINT "classes_status" CHECK ("classes"."status" in ('draft', 'open', 'completed', 'finalized', 'cancelled')),
	CONSTRAINT "classes_site_required" CHECK ("classes"."delivery_method" = 'virtual' or "classes"."training_site_id" is not null),
	CONSTRAINT "classes_cancellation_reason" CHECK ("classes"."status" <> 'cancelled' or nullif(btrim("classes"."cancellation_reason"), '') is not null)
);
--> statement-breakpoint
ALTER TABLE "class_components" ADD CONSTRAINT "class_components_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_instructors" ADD CONSTRAINT "class_instructors_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_instructors" ADD CONSTRAINT "class_instructors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_reporting_systems" ADD CONSTRAINT "class_reporting_systems_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_reporting_systems" ADD CONSTRAINT "class_reporting_systems_reporting_system_id_reporting_systems_id_fk" FOREIGN KEY ("reporting_system_id") REFERENCES "public"."reporting_systems"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_training_site_id_training_sites_id_fk" FOREIGN KEY ("training_site_id") REFERENCES "public"."training_sites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "class_components_class_schedule_idx" ON "class_components" USING btree ("class_id","starts_at");--> statement-breakpoint
CREATE INDEX "class_instructors_user_idx" ON "class_instructors" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "class_instructors_lead_unique" ON "class_instructors" USING btree ("class_id") WHERE "class_instructors"."is_lead";--> statement-breakpoint
CREATE INDEX "class_reporting_systems_system_idx" ON "class_reporting_systems" USING btree ("reporting_system_id");--> statement-breakpoint
CREATE INDEX "classes_course_idx" ON "classes" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "classes_site_idx" ON "classes" USING btree ("training_site_id");--> statement-breakpoint
CREATE INDEX "classes_creator_status_idx" ON "classes" USING btree ("created_by_user_id","status");--> statement-breakpoint
CREATE INDEX "classes_status_idx" ON "classes" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "classes_sign_in_token_hash_unique" ON "classes" USING btree ("sign_in_token_hash");