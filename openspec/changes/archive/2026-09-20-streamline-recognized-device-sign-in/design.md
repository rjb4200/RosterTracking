## Context

See `proposal.md` — Why. The remembered-device cookie is currently issued with `Path=/sign-in`, but the QR encodes `/<public-code>`, so the browser never sends the cookie to the entry route that reads it. Remember-me is a checkbox that defaults to unchecked. The page model then forces `confirm-profile` and `regular-details` as separate screens before the review step.

## Goals / Non-Goals

**Goals:**
- One recognized-student screen that both confirms identity and attests attendance.
- Device recognition that works from the QR and from raw token links.
- Remember-by-default without a checkbox.

**Non-Goals:**
- Changing phone lookup or changed-number recovery.
- Making a remembered device proof of attendance.
- Removing the `Not me` guard.

## Decisions

### D1 — Cookie scope moves to the site root

Issue the remembered-device cookie with `Path=/` so every class entry path receives it. The cookie holds only an opaque token that is stored as a hash and looked up server-side, so wider scope exposes no personal data. Alternatives: keep `Path=/sign-in` and also set a second cookie on the entry routes (two cookie names to keep in sync), or move recognition into the short-code route only (raw token links would still miss it).

### D2 — Remember by default

Remove the remember-me checkbox and always issue a token on a successful regular sign-in. `Not me` remains the recovery path and revokes the token. Alternative: keep the checkbox checked by default (still asks, still lets a student opt out and lose the fast path).

### D3 — One screen for a recognized student

When recognition is from a remembered device, render a single screen containing the name, masked FFN/KEMSIS suffixes, the resolved agency, and one `Confirm & Sign In`. The action confirms the profile and records the attestation together. Missing required fields or credentials are collected on the same screen through `Update my information` rather than a separate first step. Alternative: keep `confirm-profile` as its own screen (the current two-step path).

### D4 — Membership persistence stays inside the attendance transaction

Adding the represented agency to memberships reuses the existing staged-state pattern and is written only in the successful confirmation transaction, so abandoned sessions change nothing.

## Risks / Trade-offs

- [One-tap attestation on a shared device can attribute attendance to the wrong person] → Show the recognized name prominently, keep `Not me`, and revoke on rejection.
- [Remember-by-default leaves a token on a shared device] → Tokens expire, are revocable, are not attendance proof, and are cleared by `Not me`.
- [`Path=/` sends the token to more routes] → The value is opaque and meaningless without a matching hashed record; it carries no personal data.
- [Membership write is a new public mutation] → Scope it to adding an active agency, persist only on success, and audit it.

## Migration Plan

1. Deploy cookie-scope and remember-by-default changes; existing cookies remain valid where their path already matched.
2. Deploy the one-screen recognized-student flow.
3. Roll back by reverting application code; no schema change is required.
