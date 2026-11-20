---
description: "Release RosterTracking to the development environment with migration and GitHub tracking gates"
---
Deploy the requested RosterTracking change to development. Arguments: `$ARGUMENTS` (optional OpenSpec change, PR, issue, or release ref). This is an operational workflow, not a blanket permission to bypass environment protections.

## Non-negotiable release gates
- Follow `docs/environment-workflow.md`, `docs/operations.md`, and OpenSpec artifacts; use a named OpenSpec change when supplied, otherwise identify relevant changes/PRs/issues from git history. Never assume every issue on a branch shipped.
- First show a release plan: source and target refs, exact commit SHA, deployment environment and URL, database identity (redact connection strings), migration list, associated GitHub PRs/issues, risk, verification, and rollback.
- Use existing workflows and supported Vercel/Neon/GitHub tools. Verify actual workflow configuration and deployment state; do not pretend an agent command is a CI gate. Never guess a deployment ID, app URL, or database target.
- Ensure clean working tree for any local release actions, synced remote branches, no secrets committed, no direct commits to `main`, required CI green, passing `npm run check:migrations -- set`, and committed generated migrations. Run/check `npm run verify` with test DB configured; an integration test skipped due to absent credentials is NOT a pass. Add `verify:full` when browser-critical changes justify it, with test DBs isolated from dev/prod.
- Compare migration ledger with committed SQL using `npm run db:status` (production requires `-- --allow-production`). Treat skipped, edited, or uncommitted-applied migrations as blockers, not as issues to auto-fix. A pre-migration nonzero exit with *only pending* migrations is expected; explicitly examine output rather than accepting any failure. After applying, status MUST exit zero and say `In sync.`
- Use `DATABASE_URL_DIRECT` only for migrations; verify target database and Neon branch separately from `DATABASE_URL` and Vercel environment scope. Never print credential values. No destructive reset/provision/import/seed unless separately required, reviewed, and explicitly authorized. No migration during application startup.
- Coordinate schema and app rollout: use backward-compatible expand/migrate/contract changes for breaking schemas. Stop if the existing running version would break after migration; propose staged release instead.
- Verify actual deployed SHA, runtime logs, representative authenticated and public workflows, correct environment URL, key-health endpoint (authenticated staff access), and data integrations applicable to the change. Do not expose secrets or real attendee data in logs.
- On any failed gate, stop and report precise failure and safe recovery. Never claim success from a mere push or Vercel build.
- GitHub issue closure: identify linked issues from OpenSpec proposal/tasks, PR body, and explicit issue references; do not infer from keyword matches alone. Record deployment evidence and the deployed SHA/URL on the issue/PR. Close only issues whose acceptance criteria are verified in the intended environment. Keep others open; never auto-close unrelated issues.
- OpenSpec: validate applicable changes, check task completion, and sync/archive only according to existing `/opsx-sync` and `/opsx-archive` guidance; never archive partially deployed changes.

## Development procedure
1. Resolve the requested OpenSpec change and linked GitHub issues/PRs. Confirm the code is promoted via reviewed feature-branch PR into `dev`; never silently merge or force-push. If no explicit change is provided, inventory the commits since the last verified dev deployment.
2. Confirm green CI for the exact candidate SHA; check migrations committed and consistent. Check any affected reference-data sources, email sandboxing, required env vars and permissions; ensure dev is wired to the **development Neon database**, not production.
3. Read pre-migration status against the dev direct URL. If unexpected drift is present, STOP. If pending migrations exist, perform an approved dev migration with `npm run db:migrate` only after checking backwards compatibility; then `npm run db:status` and require clean sync. Run seeds/imports only when required by the change and explicitly reviewed.
4. Deploy/promote the exact tested `dev` SHA through the configured Vercel preview/development path; confirm that the stable dev origin points at that deployment (a generic PR preview is not enough). Never route dev to the production database or real email delivery.
5. Post-deployment check: deployed SHA/URL, smoke and relevant feature regression checks, auth/session behavior, applicable PDF/QR/email flows, runtime errors, `GET /api/staff/key-health` with authenticated staff credentials, and database ledger still in sync. If a test cannot run, identify it as unverified.
6. Record a release summary with SHA, URL, migrations, verification evidence, related PRs/issues, issues to fix, and production readiness. Comment on linked issues with development verification; **do not close production-targeted issues on dev deployment**. Only close explicitly development-only issues when fully accepted.
7. If any check fails, stop, document what is live and what is not, and provide safe recovery steps; do not automatically revert database migrations or mutate production.

## Final report
State status: PASS, BLOCKED, or PARTIAL; exact SHA/environment; migration before/after; checks performed/skipped; links to GitHub PRs/issues; unresolved blockers; next step for promotion.
