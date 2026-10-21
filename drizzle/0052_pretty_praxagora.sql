ALTER TABLE "agencies" ADD COLUMN "is_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "training_sites" ADD COLUMN "is_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "agencies_default_unique" ON "agencies" USING btree ("is_default") WHERE "agencies"."is_default";--> statement-breakpoint
CREATE UNIQUE INDEX "training_sites_default_unique" ON "training_sites" USING btree ("is_default") WHERE "training_sites"."is_default";--> statement-breakpoint
ALTER TABLE "agencies" ADD CONSTRAINT "agencies_default_active" CHECK (not "agencies"."is_default" or "agencies"."is_active");--> statement-breakpoint
ALTER TABLE "training_sites" ADD CONSTRAINT "training_sites_default_active" CHECK (not "training_sites"."is_default" or "training_sites"."is_active");