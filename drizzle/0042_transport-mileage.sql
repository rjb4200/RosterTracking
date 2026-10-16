ALTER TABLE "class_mtu_usage_items" ADD COLUMN "mileage" numeric;
--> statement-breakpoint
-- Keep mtu_usage.mileage untouched as the off-catalog / legacy text. A shared
-- value cannot be attributed safely when more than one transport was selected.
WITH single_transport AS (
  SELECT usage.class_id, min(usage.item_id::text)::uuid AS item_id
  FROM class_mtu_usage_items AS usage
  JOIN mtu_catalog_items AS catalog ON catalog.id = usage.item_id
  WHERE catalog.kind = 'transport'
  GROUP BY usage.class_id
  HAVING count(*) = 1
)
UPDATE class_mtu_usage_items AS selection
SET mileage = btrim(legacy.mileage)::numeric
FROM single_transport AS transport, mtu_usage AS legacy
WHERE selection.class_id = transport.class_id
  AND selection.item_id = transport.item_id
  AND legacy.class_id = transport.class_id
  AND btrim(legacy.mileage) ~ '^\+?([0-9]+(\.[0-9]*)?|\.[0-9]+)$';
