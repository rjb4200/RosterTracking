CREATE TABLE "agencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text,
	"address" text,
	"city" text,
	"state" text,
	"zip" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_reporting_defaults" (
	"course_id" uuid NOT NULL,
	"reporting_system_id" uuid NOT NULL,
	CONSTRAINT "course_reporting_defaults_course_id_reporting_system_id_pk" PRIMARY KEY("course_id","reporting_system_id")
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"default_hours" numeric(5, 2),
	"training_code_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credential_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"issuer" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reporting_requirement_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporting_system_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"effective_to" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reporting_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requirement_set_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"credential_type_id" uuid,
	"student_field" text,
	"is_required" boolean DEFAULT true NOT NULL,
	CONSTRAINT "reporting_requirements_target" CHECK (("reporting_requirements"."kind" = 'credential' and "reporting_requirements"."credential_type_id" is not null and "reporting_requirements"."student_field" is null) or ("reporting_requirements"."kind" = 'student_field' and "reporting_requirements"."student_field" is not null and "reporting_requirements"."credential_type_id" is null))
);
--> statement-breakpoint
CREATE TABLE "reporting_systems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_agencies" (
	"student_id" uuid NOT NULL,
	"agency_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"start_date" date,
	"end_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "student_agencies_student_id_agency_id_pk" PRIMARY KEY("student_id","agency_id")
);
--> statement-breakpoint
CREATE TABLE "student_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"credential_type_id" uuid NOT NULL,
	"value" text NOT NULL,
	"masked_suffix" text NOT NULL,
	"expiration_date" date,
	"verification_status" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_number" text,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"source_revision" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_sites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"city" text,
	"state" text,
	"zip" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "course_reporting_defaults" ADD CONSTRAINT "course_reporting_defaults_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_reporting_defaults" ADD CONSTRAINT "course_reporting_defaults_reporting_system_id_reporting_systems_id_fk" FOREIGN KEY ("reporting_system_id") REFERENCES "public"."reporting_systems"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_training_code_id_training_codes_id_fk" FOREIGN KEY ("training_code_id") REFERENCES "public"."training_codes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reporting_requirement_sets" ADD CONSTRAINT "reporting_requirement_sets_reporting_system_id_reporting_systems_id_fk" FOREIGN KEY ("reporting_system_id") REFERENCES "public"."reporting_systems"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reporting_requirements" ADD CONSTRAINT "reporting_requirements_requirement_set_id_reporting_requirement_sets_id_fk" FOREIGN KEY ("requirement_set_id") REFERENCES "public"."reporting_requirement_sets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reporting_requirements" ADD CONSTRAINT "reporting_requirements_credential_type_id_credential_types_id_fk" FOREIGN KEY ("credential_type_id") REFERENCES "public"."credential_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_agencies" ADD CONSTRAINT "student_agencies_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_agencies" ADD CONSTRAINT "student_agencies_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_credentials" ADD CONSTRAINT "student_credentials_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_credentials" ADD CONSTRAINT "student_credentials_credential_type_id_credential_types_id_fk" FOREIGN KEY ("credential_type_id") REFERENCES "public"."credential_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agencies_name_idx" ON "agencies" USING btree ("name");--> statement-breakpoint
CREATE INDEX "courses_name_idx" ON "courses" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "credential_types_code_unique" ON "credential_types" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "reporting_requirement_sets_system_version_unique" ON "reporting_requirement_sets" USING btree ("reporting_system_id","version");--> statement-breakpoint
CREATE INDEX "reporting_requirements_set_idx" ON "reporting_requirements" USING btree ("requirement_set_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reporting_systems_code_unique" ON "reporting_systems" USING btree ("code");--> statement-breakpoint
CREATE INDEX "student_agencies_agency_idx" ON "student_agencies" USING btree ("agency_id");--> statement-breakpoint
CREATE UNIQUE INDEX "student_agencies_primary_unique" ON "student_agencies" USING btree ("student_id") WHERE "student_agencies"."is_primary" and "student_agencies"."is_active";--> statement-breakpoint
CREATE UNIQUE INDEX "student_credentials_student_type_unique" ON "student_credentials" USING btree ("student_id","credential_type_id");--> statement-breakpoint
CREATE UNIQUE INDEX "student_credentials_type_value_unique" ON "student_credentials" USING btree ("credential_type_id","value");--> statement-breakpoint
CREATE INDEX "student_credentials_student_idx" ON "student_credentials" USING btree ("student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "students_phone_unique" ON "students" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "students_number_unique" ON "students" USING btree ("student_number") WHERE "students"."student_number" is not null;--> statement-breakpoint
CREATE INDEX "students_name_idx" ON "students" USING btree ("last_name","first_name");--> statement-breakpoint
CREATE UNIQUE INDEX "training_codes_code_revision_unique" ON "training_codes" USING btree ("code","source_revision");--> statement-breakpoint
CREATE INDEX "training_codes_code_idx" ON "training_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "training_sites_name_idx" ON "training_sites" USING btree ("name");