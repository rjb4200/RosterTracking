ALTER TABLE "agencies" ADD COLUMN "contact_name" text;--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "host_agency_id" uuid;--> statement-breakpoint
INSERT INTO "agencies" ("name") SELECT 'Winchester Fire Department' WHERE NOT EXISTS (SELECT 1 FROM "agencies" WHERE lower(btrim("name")) = lower(btrim('Winchester Fire Department')));--> statement-breakpoint
UPDATE "classes" SET "host_agency_id" = (SELECT "id" FROM "agencies" WHERE lower(btrim("name")) = lower(btrim('Winchester Fire Department')) ORDER BY "created_at" LIMIT 1) WHERE "host_agency_id" IS NULL;--> statement-breakpoint
ALTER TABLE "classes" ALTER COLUMN "host_agency_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_host_agency_id_agencies_id_fk" FOREIGN KEY ("host_agency_id") REFERENCES "public"."agencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "classes_host_agency_idx" ON "classes" USING btree ("host_agency_id");--> statement-breakpoint
CREATE UNIQUE INDEX "agencies_name_unique" ON "agencies" USING btree (lower(btrim("name")));--> statement-breakpoint
INSERT INTO "role_permissions" ("role_id", "permission_id") SELECT r."id", p."id" FROM "roles" r, "permissions" p WHERE r."code" = 'instructor' AND p."code" = 'agencies.manage' ON CONFLICT DO NOTHING;
