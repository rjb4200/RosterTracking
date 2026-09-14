ALTER TABLE "classes" DROP CONSTRAINT "classes_delivery_method";--> statement-breakpoint
ALTER TABLE "classes" DROP CONSTRAINT "classes_site_required";--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "classes"
    WHERE "delivery_method" NOT IN ('in_person', 'virtual', 'hybrid')
  ) THEN
    RAISE EXCEPTION 'Cannot migrate unknown class delivery method values';
  END IF;
END $$;--> statement-breakpoint
UPDATE "classes" SET "delivery_method" = 'classroom' WHERE "delivery_method" = 'in_person';--> statement-breakpoint
UPDATE "classes" SET "delivery_method" = 'online' WHERE "delivery_method" = 'virtual';--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_delivery_method" CHECK ("classes"."delivery_method" in ('classroom', 'hands_on', 'online', 'hybrid'));--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_site_required" CHECK ("classes"."delivery_method" = 'online' or "classes"."training_site_id" is not null);
