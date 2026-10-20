ALTER TABLE "class_components" DROP CONSTRAINT "class_components_method";--> statement-breakpoint
ALTER TABLE "classes" DROP CONSTRAINT "classes_site_required";--> statement-breakpoint
ALTER TABLE "classes" DROP CONSTRAINT "classes_delivery_method";--> statement-breakpoint
UPDATE "classes" SET "delivery_method" = 'classroom,online' WHERE "delivery_method" = 'hybrid';--> statement-breakpoint
INSERT INTO "training_sites" ("id", "name", "is_active")
SELECT gen_random_uuid(), 'Online', true
WHERE EXISTS (SELECT 1 FROM "classes" WHERE "training_site_id" IS NULL)
  AND NOT EXISTS (SELECT 1 FROM "training_sites" WHERE lower(btrim("name")) = 'online');--> statement-breakpoint
UPDATE "training_sites"
SET "is_active" = true, "archived_at" = null, "updated_at" = now()
WHERE lower(btrim("name")) = 'online'
  AND EXISTS (SELECT 1 FROM "classes" WHERE "training_site_id" IS NULL);--> statement-breakpoint
UPDATE "classes"
SET "training_site_id" = (
  SELECT "id" FROM "training_sites"
  WHERE lower(btrim("name")) = 'online'
  ORDER BY "is_active" DESC, "created_at" ASC
  LIMIT 1
)
WHERE "training_site_id" IS NULL;--> statement-breakpoint
ALTER TABLE "classes" ALTER COLUMN "training_site_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "class_components" ADD CONSTRAINT "class_components_method" CHECK ("class_components"."method" is null or "class_components"."method" ~ '^(cr(,ho)?(,ol)?|ho(,ol)?|ol)$');--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_delivery_method" CHECK ("classes"."delivery_method" ~ '^(classroom(,hands_on)?(,online)?|hands_on(,online)?|online)$');