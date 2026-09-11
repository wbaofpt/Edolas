# EdolasSG Electric Sapphire Color Redesign

## Goal

Replace the current forest-green visual system across the entire website with a consistent electric-purple and sapphire palette while preserving the cinematic Minecraft identity, accessibility, and semantic feedback.

## Palette

| Role | Color | Hex |
| --- | --- | --- |
| Background | Blue black | `#080B18` |
| Primary | Electric purple | `#8B5CF6` |
| Secondary | Sapphire blue | `#38BDF8` |
| Accent | Bright cyan | `#67E8F9` |
| Highlight | Ice white | `#E0F2FE` |
| Primary text | White | `#F8FAFC` |
| Secondary text | Blue gray | `#94A3B8` |

Red remains reserved for destructive and error states. Amber remains reserved for warnings and rule severity. Neither color is used as a decorative brand accent.

## Visual Direction

The site becomes an electric sapphire portal rather than a forest realm. Purple establishes brand and primary actions, sapphire structures links and secondary controls, and cyan is reserved for energy, focus, progress, particles, and short-lived highlights. Surfaces remain dark blue-black so the palette stays cinematic rather than becoming a generic neon dashboard.

## Token Strategy

- Define canonical hexadecimal custom properties in `:root` for all seven palette roles.
- Point existing HSL-compatible Tailwind tokens to equivalent HSL values so current utility classes continue to work.
- Replace hardcoded green decorative values in product source with palette variables or palette utilities.
- Use translucent derivatives of the seven colors for borders, gradients, glows, and overlays.
- Do not introduce unrelated purple, blue, cyan, white, or gray shades when an approved token can express the role.

## Component Mapping

### Global and Header

- Page background uses `#080B18`.
- Logo tile, primary buttons, active navigation, and account identity use primary purple.
- Navigation hover lines and secondary controls use sapphire.
- Focus rings use cyan with sufficient contrast.

### Homepage and Content Pages

- Headings use highlight or primary text.
- Eyebrows, category labels, and primary icon accents use purple.
- Links and informational icons use sapphire.
- Energy lines, particles, status indicators, and small transient highlights use cyan.
- Cards use blue-black surfaces with sapphire/purple translucent borders.

### Authentication

- Login and registration backgrounds, image overlays, tabs, inputs, OTP cells, typing feedback, buttons, alerts, and verification accents adopt the new tokens.
- Error and success meaning remains distinguishable by text, icon, and color. Success uses cyan/sapphire rather than decorative green.

### Cinematic Loader

- Portal shutters and brand highlight use purple.
- Progress frame uses sapphire.
- Progress fill, tip, stars, and energy particles use cyan.
- The progress state machine and timing remain unchanged.

## Accessibility

- Primary and secondary text retain at least WCAG AA contrast against blue-black surfaces.
- Purple buttons use white text.
- Focus styling remains visible on every interactive element and does not rely on color alone.
- Error and warning states retain semantic colors and icons.
- Reduced-motion behavior remains unchanged.

## Scope

Included:

- Root tokens and page backgrounds.
- Header and navigation.
- Homepage and all content routes.
- Login and registration surfaces.
- Cinematic loading screen.
- Buttons, cards, inputs, links, focus rings, particles, borders, and decorative effects.

Excluded:

- Layout, typography, copy, authentication behavior, database behavior, and route structure.
- New dependencies, images, or video assets.

## Testing and Verification

- Add a palette contract test that validates the seven canonical tokens and rejects legacy green brand colors in active product source.
- Run the complete test suite, TypeScript, ESLint, and production build.
- Inspect desktop and mobile renders for contrast, hierarchy, overflow, and consistency.

## Acceptance Criteria

- All seven approved colors have canonical CSS tokens.
- No active branded surface retains the previous forest-green palette.
- Purple, sapphire, and cyan follow their defined semantic roles across all routes.
- Errors and warnings keep distinct semantic colors.
- Loading behavior and authentication behavior are unchanged.
- Desktop and mobile remain readable and responsive.
