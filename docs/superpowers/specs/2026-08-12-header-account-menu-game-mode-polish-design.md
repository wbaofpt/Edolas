# Header, Account Menu, and Game Mode Polish Design

## Goal

Fix content hidden beneath the fixed header, redesign the signed-in account control as an accessible dropdown with logout, and give game mode cards a more intentional cinematic treatment without changing authentication rules, route content, or the approved color palette.

## Scope

- Fix fixed-header clearance on `/game-modes`, `/forum`, `/wiki`, and `/discipline`.
- Prevent the EdolasSG logo and subtitle from overlapping or clipping at supported widths.
- Replace the static signed-in identity block with an interactive account menu on desktop and mobile.
- Redesign game mode cards on the homepage and `/game-modes` using shared visual primitives.
- Preserve the existing loader, navigation routes, user data, and logout endpoint.

## Header Layout

- Content routes receive at least 7rem of top clearance so their back link and heading begin below the 5rem fixed header.
- The logo icon remains 44 by 44 pixels and cannot shrink.
- The wordmark block uses explicit line heights, a minimum width, and non-wrapping labels so `EDOLASSG` and `Minecraft Network` remain separated.
- The desktop navigation may shrink before the logo; the logo itself remains readable.
- Mobile continues to show the existing menu trigger and uses the same clearance rules.

## Signed-In Account Menu

### Trigger

- The current avatar, display name, and username become a semantic `button`.
- A chevron communicates that the control opens a menu.
- The trigger has a sapphire border, blue-black surface, cyan focus treatment, and a subtle purple hover glow.
- The control exposes `aria-expanded`, `aria-haspopup="menu"`, and a stable menu id.

### Dropdown

- The menu aligns to the right edge of the trigger on desktop.
- It repeats the avatar and identity in a compact account summary, followed by a separator and a destructive logout action.
- The logout action uses red only because it is destructive; all other decoration uses the approved palette.
- The dropdown opens and closes with a short opacity and vertical transform animation. Reduced-motion removes the displacement and shortens the transition.
- Clicking outside, pressing `Escape`, selecting logout, or opening the mobile navigation closes the account menu.

### Logout Flow

1. The user selects `Đăng xuất`.
2. The client sends `POST /api/auth/logout`.
3. While pending, the action is disabled and shows `Đang đăng xuất...`.
4. On success, the menu closes and `router.refresh()` refreshes server-rendered account state while preserving the current route.
5. On failure, the menu stays open and shows a concise inline error; the current session UI is not cleared optimistically.

The request behavior lives in a small client auth helper with injected request and refresh dependencies so success and failure paths can be tested without rendering the header.

## Game Mode Cards

- Homepage cards and `/game-modes` cards share the same `mode-card` visual language.
- Each card includes a two-digit index, gradient energy rail, mode title, status pill, description, and feature chips.
- Card surfaces use blue-black depth, sapphire separators, a restrained purple corner glow, and cyan transient highlights.
- Status pills are visually stronger than feature chips but remain secondary to the title.
- Hover and keyboard focus lift the card slightly, brighten the border, and reveal a diagonal energy sheen.
- Motion is limited to `transform` and `opacity`; no width, height, or layout animation is introduced.
- Existing mode content and gradient assignments remain unchanged.
- Mobile cards remain single-column and keep all text visible without horizontal scrolling.

## Accessibility

- Account trigger and logout action have at least a 44px interactive target.
- Dropdown supports keyboard opening, `Escape` dismissal, visible focus, and meaningful ARIA state.
- Information is not communicated by color alone: logout includes an icon and label, statuses retain text, and account state includes avatar plus identity text.
- Text and controls continue using palette pairs already verified against `#080B18`.

## Testing

- Add a failing unit test for logout client behavior before implementation.
- Verify a successful response calls refresh exactly once with `POST /api/auth/logout`.
- Verify a failed response throws and does not refresh.
- Keep existing auth route, palette, loader, and motion tests green.
- Run `npm test`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`.
- Verify the development server returns HTTP 200 on port 3000 with no second server on port 3001.

## Non-Goals

- No profile or settings page.
- No changes to session storage, cookies, database schema, or logout API response.
- No changes to loader timing or page copy.
- No new dependency, image, or video asset.
