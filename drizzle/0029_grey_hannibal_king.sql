CREATE TABLE "agency_tag_links" (
	"agency_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"subtype" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agency_tag_links_agency_id_tag_id_pk" PRIMARY KEY("agency_id","tag_id"),
	CONSTRAINT "agency_tag_links_subtype_valid" CHECK ("agency_tag_links"."subtype" is null or "agency_tag_links"."subtype" in ('schools', 'hospital', 'industry', 'business', 'churches'))
);
--> statement-breakpoint
CREATE TABLE "agency_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agency_tag_links" ADD CONSTRAINT "agency_tag_links_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_tag_links" ADD CONSTRAINT "agency_tag_links_tag_id_agency_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."agency_tags"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agency_tag_links_agency_idx" ON "agency_tag_links" USING btree ("agency_id");--> statement-breakpoint
CREATE UNIQUE INDEX "agency_tags_code_unique" ON "agency_tags" USING btree ("code");