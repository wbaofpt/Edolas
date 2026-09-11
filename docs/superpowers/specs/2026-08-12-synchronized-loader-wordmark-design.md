# Synchronized Loader Wordmark Design

## Objective

Hide document scrollbars for the complete loader lifetime, start every cinematic layer at the same moment as the progress bar, and redesign the loader wordmark to match the supplied pixel reference.

## Visual Direction

- Display `MINECRAFT NETWORK // SEASON 03` in cyan pixel type above the loader wordmark.
- Render `EDOLAS` in icy white and `SG` in electric purple.
- Use compact letter spacing, block shadows, and two brief horizontal glitch slices while progress runs.
- Stop all wordmark glitch motion when progress completes.
- Keep the shared header wordmark structure, but hide the season label and disable loader-only glitch effects in the header.

## Motion Timeline

The loader initially renders with `data-motion="idle"`. On the first animation frame after hydration it changes to `data-motion="running"`. The progress fill, sky arrival, stars, terrain, motes, brand entrance, energy tip, and wordmark glitches all start from that same state transition.

The progress duration remains the timeline authority. At 100%, the current settle interval runs with a static full bar and wordmark, followed by the existing shutter exit.

Reduced-motion mode uses the existing short duration and disables decorative particles and glitches.

## Scroll Lock

CSS uses `html:has(.cinematic-loader)` and the matching body selector to hide overflow before hydration. The loader effect also locks both `document.documentElement` and `document.body` as a fallback, restoring their prior inline values after completion.

## Performance and Accessibility

- Animate only transform and opacity on large surfaces.
- Keep glitch effects on text pseudo-elements only.
- Preserve the live loader status and skip button.
- Keep the header link's accessible label because the shared decorative wordmark remains `aria-hidden`.

## Verification

- Unit-test `idle` and `running` motion states.
- Source-test shared wordmark structure, season copy, synchronized selectors, and dual-root scroll locking.
- Browser-test scrollbar absence and simultaneous progress/background animation start.
- Verify wordmark bounds at mobile and desktop widths.
- Run TypeScript, ESLint, all tests, and production build.

## Out of Scope

- Route-transition loaders.
- New raster assets or fonts.
- Changes outside the loader and shared wordmark.
