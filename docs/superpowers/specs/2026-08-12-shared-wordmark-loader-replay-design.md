# Shared Wordmark and Loader Replay Design

## Objective

Make the site header use the same recognizable `EDOLAS` + `SG` pixel wordmark as the cinematic loader, and make the loader progress bar visibly run to completion on every full document load or browser refresh.

## Scope

- Replace the header's sword tile and compact `EDOLASSG` label with the cinematic wordmark treatment.
- Keep `EDOLAS` in the primary text color and `SG` in electric purple.
- Keep the `MINECRAFT NETWORK` kicker as part of the brand lockup.
- Run the cinematic loader once for every full page load or refresh.
- Do not replay the loader for client-side route navigation while the root layout remains mounted.
- Preserve the existing color palette, cinematic background, shutter exit, skip control, and responsive header behavior.

## Component Design

Create a small shared `BrandWordmark` presentation component with semantic variants for `header` and `loader`. The component owns the common text structure and accessible label, while CSS classes control scale and spacing for each location.

The header variant is compact enough for the existing 80px header and hides or reduces the kicker only where required by narrow mobile space. The loader variant retains the current centered, large-scale presentation.

No raster image or external asset is needed because the current pixel font and palette already define the approved logo appearance.

## Loader Behavior

The loader starts in `playing` for each new root-layout mount. Its single progress fill animates from `scaleX(0)` to `scaleX(1)` using compositor-only transforms. Once progress completes, it remains at 100% for the existing settle interval, then the shutters open and the loader unmounts.

Session storage no longer controls whether the loader plays. This removes the hydration flash where server-rendered loader markup appears briefly with an empty bar before the client reads the previous completion flag and closes it.

The skip button still completes the current loader immediately. Reduced-motion mode keeps the same sequence with shorter durations instead of removing the progress state entirely.

## State Flow

1. Full document load mounts the root layout and loader in `playing`.
2. Progress animates continuously from 0% to 100%.
3. Completion starts the settle interval while the bar remains full.
4. Loader advances to `exiting`; shutters open.
5. Loader advances to `complete` and unmounts.
6. Client-side navigation does not remount the root loader and therefore does not replay it.

## Accessibility and Performance

- The wordmark remains text, preserving sharp rendering and avoiding decorative image alt-text problems.
- The header link retains its descriptive `aria-label` and visible keyboard focus treatment.
- Progress and shutter motion use `transform` and `opacity`; no width or layout animation is introduced.
- Reduced-motion users receive a short, deterministic progress sequence.
- The existing live status remains available while the loader is active.

## Verification

- Unit tests confirm the loader starts in `playing`, reaches `exiting` only after progress completion, and no longer depends on session storage.
- Source-level UI tests confirm both header and loader use the shared wordmark component.
- Browser runtime inspection confirms progress transform increases from 0 to 1 and the loader remains mounted until completion.
- Verify desktop and mobile header layout, keyboard focus, reduced-motion behavior, TypeScript, ESLint, the complete test suite, and production build.

## Out of Scope

- Route-transition loading screens.
- Changes to account, Discord, navigation, authentication, or footer branding.
- New logo artwork, image generation, or external font dependencies.
