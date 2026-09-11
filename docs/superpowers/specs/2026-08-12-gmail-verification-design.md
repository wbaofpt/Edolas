# Gmail Email Verification Design

## Goal

Send EdolasSG registration codes through Gmail SMTP using an App Password and present a polished, accessible verification step.

## Server Design

- Add a server-only Gmail sender backed by `nodemailer`.
- Read `GMAIL_USER`, `GMAIL_APP_PASSWORD`, and optional `EMAIL_FROM_NAME` from environment variables.
- Normalize App Password whitespace before SMTP authentication and never expose credentials or SMTP errors to clients.
- Send both a branded HTML email and a plain-text fallback containing the six-digit code and ten-minute expiry.
- Preserve development fallback codes when Gmail is not configured; production returns 503 instead.
- Limit verification requests to one per email per 60 seconds. A failed send removes the newly created verification record so an undelivered code cannot be used.

## API Design

- `POST /api/auth/request-email-code` validates and normalizes the email.
- Success returns `{ ok: true, message, retryAfter: 60 }` and includes `devCode` only outside production when SMTP is absent.
- Cooldown returns 429 with `{ error, retryAfter }`.
- SMTP failure returns a generic 502 response and records the detailed error only on the server.

## Interface Design

- Keep the existing two-step registration flow.
- Present the recipient email in a focused verification panel.
- Use one native `autocomplete="one-time-code"` input styled as six visual cells so paste, password-manager autofill, keyboard input, and screen readers remain reliable.
- Accept digits only and cap input at six characters.
- Add a resend action with a 60-second countdown, loading feedback, success feedback, and server-provided cooldown handling.
- Keep motion limited to status/step feedback and respect reduced-motion settings.

## Verification

- Unit-test email content, SMTP configuration, cooldown, failed-send cleanup, and OTP normalization.
- Run the complete test suite, lint, TypeScript validation, and production build.
- Smoke-test the register flow at desktop and mobile widths.

