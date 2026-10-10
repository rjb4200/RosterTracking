CREATE TABLE "class_mtu_usage_items" (
	"class_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"quantity" numeric(10, 2),
	"source" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "class_mtu_usage_items_class_id_item_id_pk" PRIMARY KEY("class_id","item_id"),
	CONSTRAINT "class_mtu_usage_items_source" CHECK ("class_mtu_usage_items"."source" in ('suggested', 'manual'))
);
--> statement-breakpoint
CREATE TABLE "mtu_catalog_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"unit_label" text,
	"per_class_qty" numeric(10, 2),
	"per_student_qty" numeric(10, 2),
	"rounding" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"archived_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mtu_catalog_items_archived_state" CHECK ("mtu_catalog_items"."archived_at" is null or not "mtu_catalog_items"."is_active"),
	CONSTRAINT "mtu_catalog_items_kind" CHECK ("mtu_catalog_items"."kind" in ('equipment', 'supplies')),
	CONSTRAINT "mtu_catalog_items_rule_shape" CHECK (("mtu_catalog_items"."kind" = 'supplies' and "mtu_catalog_items"."unit_label" is not null and "mtu_catalog_items"."rounding" in ('ceil', 'exact') and ("mtu_catalog_items"."per_class_qty" is null or "mtu_catalog_items"."per_class_qty" >= 0) and ("mtu_catalog_items"."per_student_qty" is null or "mtu_catalog_items"."per_student_qty" >= 0)) or ("mtu_catalog_items"."kind" = 'equipment' and "mtu_catalog_items"."unit_label" is null and "mtu_catalog_items"."rounding" is null and "mtu_catalog_items"."per_class_qty" is null and "mtu_catalog_items"."per_student_qty" is null))
);
--> statement-breakpoint
ALTER TABLE "class_mtu_usage_items" ADD CONSTRAINT "class_mtu_usage_items_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_mtu_usage_items" ADD CONSTRAINT "class_mtu_usage_items_item_id_mtu_catalog_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."mtu_catalog_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "class_mtu_usage_items_item_idx" ON "class_mtu_usage_items" USING btree ("item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mtu_catalog_items_kind_name_unique" ON "mtu_catalog_items" USING btree ("kind",lower(btrim("name")));--> statement-breakpoint
CREATE INDEX "mtu_catalog_items_kind_idx" ON "mtu_catalog_items" USING btree ("kind","sort_order");