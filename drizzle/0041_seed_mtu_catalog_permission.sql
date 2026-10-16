-- Seed the Mobile Training Unit catalog permission and grant it to the roles that
-- manage reference data. The permission was introduced with the MTU catalog feature
-- but only ever created by `seedFoundation`, so databases seeded before that feature
-- have neither the permission nor its grants and their staff navigation hides the MTU
-- catalog. Idempotent: re-running changes nothing, and on a fresh database the role
-- grants are (re)created by the foundation seed that follows the migrations.
INSERT INTO "permissions" ("code", "description")
VALUES ('mtu-catalog.manage', 'Manage the Mobile Training Unit equipment and supplies catalog')
ON CONFLICT ("code") DO UPDATE SET "description" = EXCLUDED."description";--> statement-breakpoint
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."code" IN ('administrator', 'training-major')
	AND p."code" = 'mtu-catalog.manage'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
