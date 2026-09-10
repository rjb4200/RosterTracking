## Context

Current sign-in access depends on an opaque, one-time-returned raw token whose hash and version are retained on the class record. Public token resolution and student workflow context are already state-limited to open classes. The landing page currently has no public class discovery, and class setup has no configurable student access gate.

## Goals / Non-Goals

**Goals:**
- Provide one stable public class identity usable as a typed URL, QR payload, and landing-page action.
- Keep public access valid only while class state is open.
- Make the optional numeric PIN legibly distinct from the public class code and viewable by authorized instructors.
- Preserve existing valid raw-token links during the transition.

**Non-Goals:**
- Strong authentication, brute-force resistance, student accounts, or public roster access.
- Replacing existing raw-token rotation semantics for legacy links.
- Publishing details of draft, completed, finalized, or cancelled classes.

## Decisions

### Persist a four-character public class code

Add a unique uppercase four-character public code to class records. Generate it from an unambiguous alphanumeric alphabet and retry collisions before persisting. The public route is `/<code>` and the canonical URL is built from the configured public application origin.

Persisted codes are chosen over signed URLs because the URL must remain readable, stable, and look-upable from the public directory for the full open class lifetime. A signed payload would still require a lookup for state enforcement and complicate collision-free manual access.

### Keep public and legacy access as separate resolvers converging on one workflow

The short-code resolver looks up the public code and validates that the class is open. The existing raw-token resolver continues to validate token hash and version. Both feed a shared public-access decision that either establishes the current student workflow context or presents PIN entry first.

This avoids changing the meaning of issued raw tokens while ensuring all new access methods observe the same class-state and PIN rules.

### Model the PIN as opt-in, generated, and displayable

Store an explicit PIN-enabled flag and a protected four-character PIN value. New classes default to disabled. Enabling generates a PIN with digits only, preserving leading zeroes; disabling removes the public gate. The stored PIN must be recoverable by the authorized staff view but excluded from public responses and telemetry.

A reversible protected value is selected over a one-way hash because instructors need to display the current PIN. Plaintext storage is rejected even though this is a low-assurance gate, since protected storage is already the project convention for sensitive class-related values.

### Public directory uses a purpose-built read model

Expose only open classes and the fields listed in the public-directory spec through a dedicated query and DTO. Resolve each class's next session from its future or earliest scheduled component. Format instructor identities as first initial plus last name at the public boundary.

This is preferred to reusing staff class detail data because it makes accidental exposure of roster, reporting, class IDs, or account data less likely.

### Route precedence remains explicit

Use a single root dynamic segment for four-character public codes and preserve existing static routes for staff, admin, sign-in, and application pages. The resolver validates code shape before lookup and returns a generic unavailable result for all non-open or unknown codes.

## Risks / Trade-offs

- A four-character code has a finite namespace and can be guessed. → Codes expose only the already-public open-class access flow; lifecycle checks and the optional PIN limit the practical impact.
- A numeric PIN can be guessed. → It is explicitly a convenience gate, not authentication; PINs remain absent from URLs, logs, and public lists.
- New root dynamic routing can conflict with future top-level pages. → Reserve static routes first and validate the four-character code format before treating a request as public class access.
- Legacy classes lack public codes. → Provision a code lazily when authorized staff request access material, while retaining valid raw-token links.
- Public class cards may expose stale session ordering. → Calculate the next session at request time from persisted components and omit stale/inactive classes entirely.

## Migration Plan

1. Add nullable stable public-code and PIN fields with a unique index on the public code.
2. Generate public codes for new classes and generate a code lazily for existing open classes when authorized staff request student access material.
3. Deploy public short-code resolution, shared PIN gating, and instructor access display before directing new QR generation to short URLs.
4. Deploy the landing-page directory after the resolver is available.
5. Roll back by removing public entry points and new QR generation while leaving stored fields and legacy raw-token behavior intact.
