# EdolasSG Auth Redesign and Data Alignment

## Goal

Redesign login and registration as a cinematic split-portal experience, align the live MySQL schema with the auth API, and implement real password-based login with revocable database sessions.

## Current Evidence

- MySQL 8.0.46 is reachable and `/api/health` reports a working connection.
- The live `users` table has three unique seed users and no missing usernames or display names.
- The live schema is missing `email`, `password_hash`, `referral_code`, `email_verified_at`, and `remember_login`; `03_auth.sql` has not been applied.
- Registration code expects the missing columns and cannot complete against the live schema.
- Login currently performs no API request, password verification, or session creation.
- Existing forum foreign keys have no orphan category or author references.

## UX Design

### Shared Shell

- Desktop uses a two-column portal layout: an atmospheric Edolas world panel on the left and a focused form panel on the right.
- The world panel contains the Edolas identity, server status, and three concise account benefits.
- Mobile collapses to one column and turns the world artwork into a low-contrast background.
- Login and registration use separate focused form components inside one shared visual shell.

### Login

- Accept one identifier field for username or email and one password field.
- Offer a “remember this device” checkbox that controls session duration.
- Provide a clear loading state, field-associated errors, and a generic invalid-credentials response.
- On success, create the session cookie and redirect to the homepage.

### Registration

- Use two visible steps: account details, then email verification.
- Step one collects display name, username, email, password, optional referral code, and remember-device preference.
- Step two sends and verifies a six-digit email code before account creation.
- Preserve entered values when moving between steps and expose a clear back action.
- On success, create a session immediately and redirect to the homepage.

### Accessibility and Motion

- Every input has a persistent label and stable ID.
- Field errors use `aria-invalid` and `aria-describedby`; form-level feedback uses `aria-live`.
- Password visibility buttons have accessible names.
- Keyboard focus remains visible and follows the form’s natural DOM order.
- Decorative artwork and icons do not enter the accessibility tree.
- Motion uses opacity and transform only, is reduced on mobile, and is removed by `prefers-reduced-motion`.

## Auth Architecture

### Passwords

- Preserve the existing `salt:hash` scrypt storage format.
- Move password hashing and verification into a focused server-only module.
- Verify derived hashes with `timingSafeEqual`.
- Never expose password hashes or distinguish “unknown user” from “wrong password” in API responses.

### Sessions

- Add `auth_sessions` with a user foreign key, unique token hash, expiry, creation time, and last-used time.
- Generate a cryptographically random opaque token and store only its SHA-256 hash in MySQL.
- Send the raw token only in a cookie named `edolas_session`.
- Cookie attributes: `HttpOnly`, `SameSite=Lax`, path `/`, and `Secure` in production.
- Standard sessions expire after 24 hours; remembered sessions expire after 30 days.
- Logout deletes the current session row and clears the cookie.

### API Flow

- `POST /api/auth/register` validates data, requires a verified email, inserts the user, creates a session in one transaction, and consumes the verification record only after commit.
- `POST /api/auth/login` normalizes the identifier, finds a user by username or email, verifies the password, creates a session, and returns a generic 401 on failure.
- `POST /api/auth/logout` revokes the matching session and clears the cookie.
- Login and registration responses never return session tokens in JSON.

### Email Verification

- Keep the current in-memory verification store for this scope.
- Document that verification records are process-local and unsuitable for multi-instance production deployment.
- Preserve the current Resend integration and development-only code response.

## Database Migration

- Make `03_auth.sql` safely add the five existing auth columns if absent.
- Add unique indexes for normalized email behavior supported by the current case-insensitive database collation.
- Create `auth_sessions` idempotently with an index on `user_id`, a unique token hash, and an expiry index.
- Keep auth columns nullable so the three legacy seed users remain valid.
- Do not synthesize passwords or email addresses for legacy users.
- Stop using `remember_login` as account state; session duration is per login. The legacy column may remain for backward-compatible migration safety but application code will not write it.

## Data Quality Verification

After migration, verify:

- Required auth columns and `auth_sessions` exist with expected types and indexes.
- `users.id` and normalized usernames remain unique.
- Non-null emails are unique and normalized.
- Users with a password hash have an email and verified timestamp.
- Session token hashes are unique, sessions reference existing users, and expiry is later than creation.
- Existing three seed users remain present and unchanged except for newly nullable auth columns.
- No forum foreign-key orphans are introduced.

## Error Handling

- Validation failures return 400 with a stable field-error map.
- Duplicate username or email returns 409 without leaking unrelated DB details.
- Invalid login returns one generic 401 response.
- Database unavailability returns 503 and does not claim account creation or login succeeded.
- Unexpected database errors are logged server-side without returning raw SQL messages.

## Testing and Verification

- Unit-test password hashing/verification and session token hashing/expiry.
- Route-test registration validation, duplicate handling, invalid login, and successful cookie creation using controlled database boundaries.
- Run `npm test`, `npm run lint`, `npx tsc --noEmit`, and a production build.
- Run read-only SQL profiling before and after migration and report concrete row, null, duplicate, and orphan counts.
- Smoke-test login and registration at desktop and mobile widths, including keyboard navigation and reduced-motion mode.

## Scope

This change includes login, registration, logout, migration, sessions, and auth UI. It excludes OAuth, password reset, account recovery, device-management UI, role administration, and forced credential creation for legacy seed users.
