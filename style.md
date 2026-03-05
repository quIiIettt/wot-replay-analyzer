# QR-ZY Design Style Guide


## Source of Truth Files

- `frontend/src/app/globals.css`
- `frontend/src/app/layout.tsx`
- `frontend/src/components/ui/Input.tsx`
- `frontend/src/components/ui/Select.tsx`
- `frontend/src/components/ui/Button.tsx`
- `frontend/src/components/ui/Card.tsx`

## Typography

- Base font (`font-sans`): Manrope
- Heading font variable: Outfit (`--font-outfit`)
- Keep hierarchy simple:
  - page title: `text-4xl md:text-6xl font-bold`
  - section title: `text-2xl font-semibold`
  - control text: `text-sm`
  - helper text: `text-xs text-muted-foreground`

## Theme Tokens

Defined in `frontend/src/app/globals.css`.

### Light Theme Tokens

- `--background: 230 100% 99%`
- `--foreground: 226 39% 15%`
- `--card: 0 0% 100%`
- `--primary: 229 88% 61%`
- `--muted: 230 44% 96%`
- `--border: 228 31% 86%`
- `--input: 228 31% 86%`
- `--ring: 229 88% 61%`

### Dark Theme Tokens

- `--background: 229 24% 7%`
- `--foreground: 220 23% 96%`
- `--card: 229 20% 10%`
- `--primary: 220 23% 96%`
- `--muted: 228 17% 13%`
- `--border: 228 16% 22%`
- `--input: 228 16% 22%`
- `--ring: 228 30% 62%`

## Layout and Background Style

- Root layout uses:
  - `ambient-bg` from `globals.css`
  - `GlobalPageIcons`
- Page containers use:
  - `app-shell`
  - `container mx-auto px-4 md:px-8`
- Main hero glow circles (home-like) pattern:
  - top left: `bg-indigo-300/25 ... blur-[140px]`
  - top right: `bg-blue-300/20 ... blur-[140px]`
  - bottom: `bg-cyan-200/20 ... blur-[140px]`

## Component Rules

### Input and Select Must Match

Use the same visual language for both controls.

- Required base classes (Input-like):
  - `border border-input`
  - `bg-background/80`
  - `text-foreground`
  - `hover:border-ring/45`
  - `focus-visible:border-ring`
  - `focus-visible:ring-2 focus-visible:ring-ring/45`
  - `focus-visible:ring-offset-2 focus-visible:ring-offset-background`
  - `dark:shadow-black/25`

Do not create separate dark-only colors for Select trigger that conflict with Input.

### Select Dropdown

- Panel:
  - `border border-input`
  - `bg-background/95`
  - `backdrop-blur-xl`
- Active option:
  - `border-ring/40 bg-accent text-accent-foreground`
- Hover option:
  - `hover:border-ring/20 hover:bg-accent/70`
- Use custom scrollbar class:
  - `qrzy-select-scrollbar` (defined in `globals.css`)

### Card

- Use `Card` component defaults:
  - light: translucent white + slate border
  - dark: translucent dark card + subtle white border
- Avoid replacing card background with pure black unless explicitly needed.

### Button

- Use variants from `Button.tsx`:
  - `default`, `outline`, `secondary`, `ghost`, `destructive`, `glass`
- Prefer `outline` for low-emphasis actions.
- Keep focus ring behavior consistent; do not remove it.

## Social Pages Specific Rules

### `/qr-for-socials`

- Form controls (title, platform selector, template selector, URL input) must look cohesive.
- Select controls must visually match `Landing title` input in both themes.

### Landing Templates

- If avatar image is shown, do not duplicate platform icon unless product requires it.
- Avoid duplicate labels (example: platform + same platform name again).
- Preferred text order:
  - line 1: username/handle (`font-bold`)
  - line 2: display URL (`same color family`, slightly smaller, no heavy accent)

## Do / Do Not

### Do

- Reuse design tokens (`background`, `foreground`, `border`, `ring`, `accent`).
- Reuse shared UI components (`Input`, `Select`, `Button`, `Card`).
- Keep light and dark parity when changing any control.

### Do Not

- Hardcode unrelated dark colors for one component only.
- Mix random border colors (`white`, `black`) when token classes exist.
- Add duplicate identity signals (icon + repeated platform text + repeated label).

## Pre-PR Style Checklist

Before merging UI changes:

1. Compare in light and dark themes.
2. Verify `Input` and `Select` parity on the same page.
3. Verify focus/hover/disabled states.
4. Check mobile spacing and text truncation.
5. Run:
   - `npx eslint ...`
   - `npx tsc --noEmit`

