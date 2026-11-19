ALTER TABLE "class_components" DROP CONSTRAINT "class_components_method";--> statement-breakpoint
ALTER TABLE "class_components" ADD CONSTRAINT "class_components_method" CHECK ("class_components"."method" is null or "class_components"."method" ~ '^(cr(,ho)?(,ol)?|ho(,ol)?|ol)$');
