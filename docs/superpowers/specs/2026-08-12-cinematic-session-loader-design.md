# EdolasSG Cinematic Session Loader

## Goal

Add a cinematic full-screen opening that appears once per browser tab session, establishes the EdolasSG Minecraft atmosphere, and reveals the website without delaying later navigation.

## Experience

- Show the opening only when the current tab has not completed it before.
- Keep the normal sequence near 1.8 seconds.
- Present a dark realm backdrop, block-like terrain silhouettes, rising energy motes, the EdolasSG wordmark, a rune-style progress line, and two portal shutters that separate to reveal the page.
- Provide a visible `Bỏ qua` button from the beginning.
- Mark completion in `sessionStorage`; refreshes and route changes in the same tab do not replay it.
- A new tab or browser session may play it again.
- Do not wait for fake network progress. The progress animation communicates the fixed opening sequence only.

## Architecture

### `CinematicLoader`

A client component mounted once from the root layout. It owns four states:

1. `checking`: determine whether the opening already completed.
2. `playing`: render and run the sequence.
3. `exiting`: open the portal shutters and fade the overlay.
4. `complete`: unmount the overlay and leave the website interactive.

The component writes the completion key before beginning its exit so an interrupted navigation does not replay the opening.

### Session Preference

A small pure helper defines the storage key and determines whether the loader should play. Storage access happens only in the browser and fails open: if `sessionStorage` is unavailable, the site remains usable and the opening may play once for the current mount.

### Visual Layers

- Fixed opaque base prevents underlying content from flashing.
- CSS-only terrain silhouettes and portal lines avoid image downloads.
- Decorative particles use a small fixed element count.
- Wordmark and loading copy remain real text.
- Exit uses two composited shutter layers translated away from center.

## Motion

- Use the existing Framer Motion dependency for sequencing and exit presence.
- Animate only `transform` and `opacity` on large surfaces.
- Do not animate blur, layout dimensions, masks, or continuously read layout.
- Pause all looping decorative motion by unmounting the loader after completion.
- Keep particles lightweight and deterministic rather than creating timers per particle.
- Existing route animation remains unchanged and starts behind the overlay.

## Accessibility

- The loader uses `role="status"`, an accessible loading label, and polite live status text.
- `Bỏ qua` is a native button with a visible focus style and at least a 44px target.
- While visible, the loader prevents background scrolling.
- Users with `prefers-reduced-motion` see a short static brand frame followed by a near-immediate fade, without particles or shutter travel.
- The overlay never traps keyboard focus; users can activate the skip button immediately.

## Responsive Behavior

- Desktop uses wider portal shutters and the full terrain composition.
- Mobile reduces particle count and visual density while keeping the logo and progress readable.
- The component respects safe-area insets for the skip button and status footer.
- No fixed pixel width may cause horizontal overflow at 375px.

## Testing

- Pure state helper tests cover first visit, already-completed session, and unavailable storage behavior.
- UI source tests verify the root layout mounts the loader and that reduced-motion and skip semantics remain present.
- Run the full unit suite, TypeScript, ESLint, and production build.

## Acceptance Criteria

- The cinematic opening appears once per tab session and starts its completion transition after 1,800ms when not skipped.
- Refreshing or navigating in the same tab does not replay it.
- Clicking `Bỏ qua` immediately reveals the page and records completion.
- Reduced-motion users are not subjected to the full sequence.
- The page is usable if browser storage throws or is unavailable.
- Mobile and desktop layouts have no horizontal overflow.
- No new runtime dependency or bitmap/video asset is introduced.
