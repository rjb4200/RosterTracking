ALTER TABLE "training_codes" DROP CONSTRAINT "training_codes_category_group";--> statement-breakpoint
ALTER TABLE "training_codes" ADD COLUMN "is_pinned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Carry the previous "core" grouping over to the pinned flag.
UPDATE "training_codes" SET "is_pinned" = true WHERE "category_group" = 'core';