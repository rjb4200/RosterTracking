DROP INDEX "student_credentials_type_value_unique";--> statement-breakpoint
ALTER TABLE "student_credentials" ADD COLUMN "value_hash" text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "student_credentials_type_value_unique" ON "student_credentials" USING btree ("credential_type_id","value_hash");