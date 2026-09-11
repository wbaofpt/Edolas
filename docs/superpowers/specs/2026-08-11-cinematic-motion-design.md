# EdolasSG Cinematic Motion Design

## Goal

Create a cinematic motion system across EdolasSG that combines a mystic Minecraft identity, a living ambient world, and trailer-like reveals. The homepage is the visual climax; content and authentication pages use restrained versions of the same language.

## Principles

- Motion must reinforce hierarchy, navigation, and atmosphere.
- Keep the existing Next.js, Tailwind, CSS, and Framer Motion stack.
- Prefer `transform` and `opacity`; avoid continuous layout and large filter animation.
- Respect `prefers-reduced-motion` and provide lighter behavior on touch/mobile devices.
- Interactive elements remain immediately usable; page motion must not delay navigation.

## Motion Architecture

Create a small shared motion layer rather than page-specific animation systems:

- `MotionProvider` tracks reduced-motion and pointer capability.
- Reusable reveal primitives provide section, heading, and stagger transitions.
- Ambient hero layers use CSS compositor animations and pointer parallax with bounded transforms.
- Interactive cards use a reusable tilt treatment on precise pointers only.
- Route feedback uses a short non-blocking portal overlay tied to internal navigation.

Framer Motion owns component and interaction animation. CSS owns ambient, decorative loops. The two systems must not mutate or measure the same element.

## Homepage

### Hero

- Apply slow depth motion to the background image, star layer, mist, and foreground glow.
- Reveal status, season label, title, description, actions, and server IP in a paced sequence.
- Add a restrained title light sweep and pixel-particle field.
- Pointer parallax is bounded and disabled on touch, mobile, and reduced-motion settings.
- The scroll cue pulses and fades as the user leaves the hero.

### Content Sections

- Reveal headings and content groups as they enter the viewport.
- Stagger cards and rows with short delays capped per group.
- Add subtle perspective tilt and cursor glow to large cards on desktop.
- Game-mode accents receive one-shot energy-line sweeps when revealed.
- The final CTA gets a stronger portal glow and a short cinematic entrance.

## Shared Site Surfaces

### Header

- Preserve the current scroll state behavior.
- Animate the mobile menu container and links with a short stagger.
- Add a sliding underline/energy indicator on navigation hover and focus.
- Keep all controls available throughout the transition.

### Content Pages

- Use a compact page-intro reveal and ambient background layer.
- Stagger primary lists and cards once per visit.
- Use restrained hover depth and directional icon movement.
- Avoid continuous motion around long-form reading content.

### Authentication Pages

- Animate the panel as a portal-like one-shot entrance.
- Keep ambient background motion slow and low contrast.
- Animate validation and status feedback without moving input positions.
- Disable tilt and cursor-follow effects around forms.

## Responsive and Accessibility

- Full effects target desktop devices with precise pointers.
- Mobile removes pointer parallax and tilt, reduces particle count, and shortens reveal distances.
- `prefers-reduced-motion: reduce` removes ambient loops, parallax, tilt, stagger delays, and route overlay choreography while preserving visible state changes.
- Focus indicators remain visible and are never replaced by hover-only feedback.
- Decorative layers are ignored by assistive technology and do not intercept pointer events.

## Performance Constraints

- No scroll-position polling for animation; use viewport observers or Framer Motion viewport behavior.
- No unbounded `requestAnimationFrame` loops.
- Pointer updates are scheduled at most once per animation frame and stop when the target is inactive.
- Continuous effects use only compositor-friendly transforms and opacity.
- Blur is static or limited to small, one-shot elements at no more than 8px animated blur.
- Avoid promoting many cards simultaneously with persistent `will-change`.

## Verification

- `npm run lint` passes.
- `npm run build` passes.
- Homepage and all routes render without runtime errors.
- Keyboard navigation and focus remain usable during transitions.
- Reduced-motion mode removes nonessential movement.
- Layout is checked at 375px, 768px, 1024px, and 1440px without horizontal overflow.
- Animation does not introduce layout shifts or delay navigation.

## Scope

This work changes presentation and interaction motion only. It does not redesign content, alter authentication/database behavior, replace the current design system, or introduce another animation library.
