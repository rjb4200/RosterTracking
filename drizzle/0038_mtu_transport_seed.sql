-- Move the van out of equipment into the new transport kind, and add the
-- department vehicle and POV. Idempotent: re-running changes nothing and never
-- duplicates an entry.
UPDATE "mtu_catalog_items"
SET "kind" = 'transport', "requires_mileage" = true, "sort_order" = 1, "updated_at" = now()
WHERE "kind" = 'equipment' AND lower(btrim("name")) = lower('Ford Transit Van 15 passenger');--> statement-breakpoint
INSERT INTO "mtu_catalog_items" ("kind", "name", "requires_mileage", "sort_order", "is_active")
SELECT 'transport', 'Department vehicle', true, 2, true
WHERE NOT EXISTS (
	SELECT 1 FROM "mtu_catalog_items"
	WHERE "kind" = 'transport' AND lower(btrim("name")) = lower('Department vehicle')
);--> statement-breakpoint
INSERT INTO "mtu_catalog_items" ("kind", "name", "requires_mileage", "sort_order", "is_active")
SELECT 'transport', 'POV', false, 3, true
WHERE NOT EXISTS (
	SELECT 1 FROM "mtu_catalog_items"
	WHERE "kind" = 'transport' AND lower(btrim("name")) = lower('POV')
);
