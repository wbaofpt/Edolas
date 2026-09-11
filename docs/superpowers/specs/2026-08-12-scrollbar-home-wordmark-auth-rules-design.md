# Scrollbar, Home Wordmark, and Auth Rules Design

## Scope

- Hide native browser scrollbars globally while preserving wheel, touch, keyboard, and programmatic scrolling.
- Add a fixed custom visual scroll indicator that appears only during active scrolling and fades after 800ms.
- Redesign only the Home hero `EDOLAS SG` lockup using the existing pixel font and electric sapphire palette.
- Restrict new usernames to 3–50 unaccented ASCII letters and digits.
- Preserve login compatibility for legacy usernames containing underscores.
- Keep one account per normalized lowercase email through the existing MySQL unique index and duplicate-key handling.
- Remove editor-sensitive default Node imports from the two reported test files.

## Scroll Indicator

A client component listens to passive scroll and resize events, batches measurements with `requestAnimationFrame`, and calculates thumb height and offset with a pure helper. Native scrollbar tracks are hidden with Firefox and WebKit rules. The custom rail is non-interactive and `aria-hidden`, so it cannot interfere with page controls; scrolling remains native.

The rail uses a thin sapphire track, a purple-to-cyan thumb, and a restrained glow. It is invisible at rest, appears while scrolling, and uses only opacity and transform transitions.

## Home Wordmark

The shared `BrandWordmark` gains a `hero` variant. The Home hero replaces its duplicate text markup with this variant inside an accessible `h1`. The lockup keeps the cyan season metadata, enlarges the white `EDOLAS` and purple `SG`, adds hard pixel shadows, and sits on a subtle structural panel with a cyan edge. Loader and header variants retain their current behavior.

## Auth Rules

New registrations use `^[A-Za-z0-9]{3,50}$` in request parsing, service defense, and browser input constraints. Existing database rows and login lookup are not migrated or rejected.

Emails continue to be trimmed and lowercased before insert. The existing `users_email_unique` MySQL index remains the race-safe authority; duplicate inserts return HTTP 409 and do not consume email verification.

## Test Diagnostics

The reported test files use named Node imports (`test`, `strict as assert`) and namespace `path` import, avoiding default-export interoperability diagnostics in editors. Root TypeScript and ESLint verification remain authoritative.

## Verification

- Unit-test scrollbar geometry and username validation.
- Source-test custom scrollbar mounting, native scrollbar hiding, hero wordmark reuse, and input constraints.
- Test duplicate email failure and verification preservation.
- Audit live DB duplicate email groups and unique index.
- Browser-test indicator visibility timing and hero bounds at mobile/desktop sizes.
- Run TypeScript, ESLint, all tests, and production build.
