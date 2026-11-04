CREATE TABLE "initial_certification_programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"hours" numeric(5, 2) NOT NULL,
	"training_code_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "initial_certification_programs_hours_positive" CHECK ("initial_certification_programs"."hours" > 0)
);
--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "initial_certification_program_id" uuid;--> statement-breakpoint
ALTER TABLE "initial_certification_programs" ADD CONSTRAINT "initial_certification_programs_training_code_id_training_codes_id_fk" FOREIGN KEY ("training_code_id") REFERENCES "public"."training_codes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "initial_certification_programs_code_unique" ON "initial_certification_programs" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "initial_certification_programs_training_code_unique" ON "initial_certification_programs" USING btree ("training_code_id");--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_initial_certification_program_id_initial_certification_programs_id_fk" FOREIGN KEY ("initial_certification_program_id") REFERENCES "public"."initial_certification_programs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "classes_initial_certification_program_idx" ON "classes" USING btree ("initial_certification_program_id");