ALTER TABLE "agencies" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "curricula" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "training_codes" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "training_sites" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "agencies" ADD CONSTRAINT "agencies_archived_state" CHECK ("agencies"."archived_at" is null or not "agencies"."is_active");--> statement-breakpoint
ALTER TABLE "curricula" ADD CONSTRAINT "curricula_archived_state" CHECK ("curricula"."archived_at" is null or not "curricula"."is_active");--> statement-breakpoint
ALTER TABLE "training_codes" ADD CONSTRAINT "training_codes_archived_state" CHECK ("training_codes"."archived_at" is null or not "training_codes"."is_active");--> statement-breakpoint
ALTER TABLE "training_sites" ADD CONSTRAINT "training_sites_archived_state" CHECK ("training_sites"."archived_at" is null or not "training_sites"."is_active");