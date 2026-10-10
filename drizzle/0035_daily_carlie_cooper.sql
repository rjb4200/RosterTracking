ALTER TABLE "reporting_requirement_sets" ADD COLUMN "inclusion_mode" text DEFAULT 'all' NOT NULL;--> statement-breakpoint
ALTER TABLE "reporting_requirement_sets" ADD COLUMN "inclusion_credential_type_id" uuid;--> statement-breakpoint
ALTER TABLE "reporting_requirement_sets" ADD CONSTRAINT "reporting_requirement_sets_inclusion_credential_type_id_credential_types_id_fk" FOREIGN KEY ("inclusion_credential_type_id") REFERENCES "public"."credential_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reporting_requirement_sets" ADD CONSTRAINT "reporting_requirement_sets_inclusion_mode" CHECK (("reporting_requirement_sets"."inclusion_mode" in ('all', 'none') and "reporting_requirement_sets"."inclusion_credential_type_id" is null) or ("reporting_requirement_sets"."inclusion_mode" = 'credential' and "reporting_requirement_sets"."inclusion_credential_type_id" is not null));--> statement-breakpoint
UPDATE "reporting_requirement_sets" SET "is_active" = false, "effective_to" = now() WHERE "is_active" AND "reporting_system_id" IN (SELECT "id" FROM "reporting_systems" WHERE "code" IN ('fire', 'kbems', 'mtu'));--> statement-breakpoint
INSERT INTO "reporting_requirement_sets" ("reporting_system_id", "version", "inclusion_mode", "inclusion_credential_type_id", "is_active")
SELECT rs."id", 2, CASE rs."code" WHEN 'fire' THEN 'credential' WHEN 'kbems' THEN 'all' ELSE 'none' END,
  CASE WHEN rs."code" = 'fire' THEN (SELECT "id" FROM "credential_types" WHERE "code" = 'ffn') ELSE null END, true
FROM "reporting_systems" rs WHERE rs."code" IN ('fire', 'kbems', 'mtu');
