## 1. Fix the layout

- [x] 1.1 Give `.select-input` a fluid width in `src/app/globals.css`, matching the existing `.search-input` rule, so a native select cannot exceed its container.
- [x] 1.2 Add a `min-width: 0` guardrail to the wizard form grid children (the direct children of the wizard's `.stack-form` and `.field` grids) so a future over-wide control cannot widen the page.
- [x] 1.3 Verify the wizard at 320, 360, 375, and 412 CSS pixel widths with long course, site, and instructor names; confirm the document has no horizontal overflow and the step-advance control is pointer-operable. (Verified against the freshly compiled stylesheet at 320/360/375/412/480/540 — no overflow, Next clickable.)
- [x] 1.4 Adjust `class-creation-wizard.tsx` markup only if the CSS change does not satisfy the layout requirement. (Not needed — the CSS change satisfied the requirement.)

## 2. Regression coverage

- [x] 2.1 Add a read-only narrow-viewport regression to `tests/e2e/class-creation.spec.ts` that opens the wizard, selects existing catalog entries with long names, and asserts the page does not overflow horizontally and the Next control is pointer-clickable. (Implemented fixture-free: no catalog selection needed — it asserts no horizontal overflow and that the action row wins the hit test at the Next control's centre. Stronger than the planned version because it needs no fixtures.)
- [x] 2.2 Allow that regression to run on both the `chromium` and `mobile-chrome` projects. (No project skip; it runs on every read-only project.)
- [x] 2.3 Keep the existing mutating creation journey running once on `chromium`. (Left unchanged.)
- [x] 2.4 Apply the same narrow-viewport reachability check to the roster finalization browser spec. (Added to `tests/e2e/confirm-and-finalize.spec.ts` against the class command screen's primary control.)

## 3. Documentation and verification

- [x] 3.1 Update `docs/verification.md` to remove the wizard known-issue entry and record that class creation and finalization mobile coverage is restored.
- [x] 3.2 Confirm no other staff screen that uses `.select-input` regressed at narrow widths. (Found that a global fluid select stretched selects inside `.inline-form` — class-list filters, reporting filter, assign-instructor, student membership — and added an `.inline-form .select-input { width: auto; min-width: 0 }` override to preserve their compact sizing.)
- [x] 3.3 Run the project checks for types, lint, unit tests, and the browser suite on `chromium` and `mobile-chrome`. (Lint, typecheck, and 149 unit tests pass. The two affected spec files pass 16/16 on chromium + mobile-chrome. Full suite: 85 passed, 5 failed — all five are pre-existing dev-environment failures in unrelated specs (`cross-site-sign-in` server-action flake, `performance` TTFB budgets on `next dev`); the sign-in spec passes when run alone.)
- [x] 3.4 Validate the change with `openspec validate fix-class-wizard-mobile-overflow --strict`.
