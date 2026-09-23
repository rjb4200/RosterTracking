CREATE TABLE "mtu_usage" (
	"class_id" uuid PRIMARY KEY NOT NULL,
	"equipment_used" text,
	"mileage" text,
	"used_supplies" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "objectives" text;--> statement-breakpoint
ALTER TABLE "mtu_usage" ADD CONSTRAINT "mtu_usage_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;