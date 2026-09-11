# Friendly Store Navigation Design

**Date:** 2026-08-14
**Status:** Approved

## Goal

Make the Edolas top-up flow easier to discover and complete without changing the existing order, payment, administration, or Paper delivery behavior.

## Scope

- Add `Nạp thẻ` to the classic desktop and mobile navigation immediately after `Chế độ chơi`.
- Redesign `/store` as a friendly guided checkout in Vietnamese.
- Preserve the existing catalog, order API, simulated payment methods, order statuses, account requirements, and delivery workflow.
- Preserve the existing Edolas palette, display fonts, square geometry, and cinematic atmosphere.

## Navigation

`Nạp thẻ` is a normal navigation link, not a highlighted CTA. It uses the same active, hover, focus, and mobile behavior as every other classic navigation item. The order is:

1. Trang chủ
2. Giới thiệu
3. Chế độ chơi
4. Nạp thẻ
5. Diễn đàn
6. Wiki
7. Kỷ luật

## Store Structure

The page uses three vertically ordered regions:

1. A concise Vietnamese introduction explaining that packages are delivered to the selected Minecraft character after confirmation.
2. A two-column checkout workspace on wide screens: the current step on the left and an always-visible order summary on the right.
3. A full-width recent-order history below the checkout workspace.

On narrow screens, all regions become one column in reading order. The summary follows the active step and never overlays or blocks form controls.

## Checkout Flow

The progress indicator uses four labels: `Nhân vật`, `Gói nạp`, `Thanh toán`, and `Hoàn tất`.

- **Nhân vật:** enter a valid Minecraft username and select a server cluster.
- **Gói nạp:** choose one package available for that cluster.
- **Thanh toán:** choose MoMo or bank transfer and review the simulated payment details.
- **Hoàn tất:** review all details, sign in when required, and create the order.

Only one primary decision is presented per step. Existing validation remains inline and linked to the affected field. Back and continue actions remain available in a stable footer.

## Order Summary

The summary is visible throughout the flow and shows:

- Minecraft character, or `Chưa nhập`.
- Cluster, or `Chưa chọn`.
- Package, or `Chưa chọn`.
- Payment method.
- Total price.
- A short note that delivery occurs after payment confirmation.

On desktop it may be sticky beneath the site header. On mobile it remains in normal document flow.

## Visual Direction

- Keep `#080B18` as the base and use the existing violet, sapphire, and cyan tokens.
- Use spacing and background layers as the primary grouping mechanism; use separators only where they clarify progress or tabular order history.
- Give package and payment choices clear selected states using an icon, border, and background rather than color alone.
- Use short 180–240 ms opacity/translate transitions for step changes and selected controls.
- Respect `prefers-reduced-motion` and avoid layout-affecting animation.
- Replace technical English labels with concise Vietnamese copy.

## Accessibility

- All inputs have visible labels and associated help/error text.
- Choice buttons retain `aria-pressed`; the active progress step retains `aria-current="step"`.
- Errors use `aria-live`, `aria-invalid`, and `aria-describedby` where applicable.
- Every interactive element keeps a visible focus indicator and a minimum practical touch target.
- Disabled submission explains the sign-in requirement in nearby visible text.

## Data And Error Handling

- Continue using `POST /api/store/orders` for order creation.
- Continue using the server-provided public package catalog and the signed-in user's recent orders.
- Catalog failures show the existing unavailable state.
- Empty package groups and API errors remain recoverable without losing entered character data.
- This redesign does not expose command templates or administrative data.

## Verification

- Source-level tests verify the header label/order and the friendly store regions/copy/accessibility hooks.
- Existing store service, API, admin, security, and Paper plugin tests remain unchanged and passing.
- Run focused tests, full tests, TypeScript checking, ESLint, and the production build.
- Manually inspect 375 px and desktop layouts if a browser preview is available.

