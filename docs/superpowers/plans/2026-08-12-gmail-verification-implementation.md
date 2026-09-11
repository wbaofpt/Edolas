# Gmail Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver Gmail App Password email verification with cooldown and a polished OTP interface.

**Architecture:** A server-only mailer owns SMTP and email rendering. The existing verification store owns code lifecycle and cooldown, while the route coordinates both through an injectable handler that can be tested without network access. The register form consumes the route contract and renders resend/countdown states.

**Tech Stack:** Next.js 14, TypeScript, Nodemailer, React 18, Framer Motion, CSS.

## Global Constraints

- Never hard-code or log Gmail credentials.
- Keep the existing ten-minute verification expiry and registration API contract.
- Allow one code request per normalized email every 60 seconds.
- Preserve a non-production dev-code fallback when Gmail is not configured.
- Respect `prefers-reduced-motion` and use native form semantics.

---

### Task 1: Verification lifecycle and Gmail sender

**Files:**
- Create: `lib/auth/email-sender.ts`
- Modify: `lib/email-verification.ts`
- Modify: `.env.example`
- Modify: `package.json`
- Test: `tests/email-verification.test.mts`
- Test: `tests/email-sender.test.mts`

**Interfaces:**
- Produces: `createVerification(email, now?)`, `removeVerification(email)`, and `getVerificationRetryAfter(email, now?)`.
- Produces: `createGmailSender(config?)` returning a function that sends `{ to, code }`.

- [ ] Write tests proving the store returns a 60-second cooldown and failed deliveries can remove a code.
- [ ] Run those tests and confirm missing APIs fail.
- [ ] Implement the minimal lifecycle APIs.
- [ ] Write tests proving the sender normalizes App Password spaces and emits HTML/plain-text content with the literal code.
- [ ] Run those tests and confirm the sender module is missing.
- [ ] Install Nodemailer and implement the server-only sender.
- [ ] Run both test files and confirm they pass.

### Task 2: Request-code route orchestration

**Files:**
- Modify: `app/api/auth/request-email-code/route.ts`
- Test: `tests/email-verification-route.test.mts`

**Interfaces:**
- Produces: `createRequestEmailCodeHandler(dependencies?)` and exported Next.js `POST` handler.
- Consumes: verification lifecycle and Gmail sender from Task 1.

- [ ] Write route tests for success, cooldown, SMTP failure cleanup, and development fallback.
- [ ] Run the tests and confirm the missing handler fails.
- [ ] Implement the injectable route handler and production `POST` export.
- [ ] Run route and existing auth tests and confirm they pass.

### Task 3: OTP and resend interface

**Files:**
- Create: `lib/auth/otp.ts`
- Modify: `components/auth/register-form.tsx`
- Modify: `app/globals.css`
- Test: `tests/otp.test.mts`

**Interfaces:**
- Produces: `normalizeOtp(value)` returning at most six ASCII digits.
- Consumes: `{ retryAfter?: number }` from the request-code API.

- [ ] Write tests for pasted text, non-digits, and six-digit truncation.
- [ ] Run the tests and confirm `normalizeOtp` is missing.
- [ ] Implement the OTP helper.
- [ ] Add the segmented code input, resend action, countdown, and accessible status feedback.
- [ ] Add responsive styles and reduced-motion behavior using the existing auth design language.
- [ ] Run OTP, UI-contract, and complete tests.

### Task 4: Final verification

**Files:**
- Verify all modified files above.

- [ ] Run `npm test` and require zero failures.
- [ ] Run `npm run lint` and require zero warnings/errors.
- [ ] Run `npx tsc --noEmit` and require exit code 0.
- [ ] Run `npm run build` and require exit code 0.
- [ ] Capture `/register` at desktop and mobile widths after entering step two.

