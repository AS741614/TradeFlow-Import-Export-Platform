# Implementation Plan - Phase 15A: TradeFlow Design System Foundation

This plan outlines the creation of a centralized design token system, a modern CSS reset, structural utility classes, and highly accessible React UI primitives (`Button`, `Input`, `Card`, `Badge`, `Spinner`) under `src/components/ui/`. No existing page structures are modified.

---

## User Review Required

> [!IMPORTANT]
> - **Centralized CSS Variables**: All existing variables in `globals.css` will be migrated into `src/styles/tokens.css` along with new color scales (50-900), spacing systems, typography parameters, and z-indexes.
> - **Modern CSS Reset**: A modern reset based on Josh Comeau's reset will be created at `src/styles/reset.css`. This provides a consistent rendering baseline across all browsers.
> - **CSS Custom Properties Constraint**: No Tailwind CSS, CSS Modules, or CSS-in-JS libraries are added. Standard CSS `@import` statements are used inside `globals.css`.
> - **Test Coverage target**: We expect to grow the test suite from 285 passing tests to **300+ passing tests** by writing 15+ new tests for the UI primitives in `src/components/ui/__tests__/`.

---

## Proposed Changes

### Component 1: Centralized Styles & Design Tokens

#### [NEW] [tokens.css](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/styles/tokens.css)
Contains CSS custom properties (`--primary-50`, `--neutral-900`, `--space-1` to `--space-9`, z-index scales, border radius scale, typography, and shadows).
* Maps current TradeFlow colors to variables to ensure backward compatibility.

#### [NEW] [reset.css](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/styles/reset.css)
A modern CSS reset to normalize margins, buttons, box-sizing, and typography defaults.

#### [NEW] [utilities.css](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/styles/utilities.css)
Layout and structural helper classes:
* `.stack-1` through `.stack-9` (Vertical spacing using flex layout)
* `.cluster-1` through `.cluster-9` (Horizontal spacing and wrapping)
* `.container` (Centralized main viewport container wrapping layout boundaries)
* `.text-sm`, `.text-md`, `.text-lg`, `.text-left`, `.text-center`, etc.
* `.visually-hidden` (A11y class for screen readers)

#### [MODIFY] [globals.css](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/globals.css)
Imports the new styles at the very top:
```css
@import "../styles/tokens.css";
@import "../styles/reset.css";
@import "../styles/utilities.css";
```
* Existing variables in `:root` will be removed/moved to `tokens.css` to prevent duplicate variable mappings.

---

### Component 2: React UI Primitives

#### [NEW] [Button.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/components/ui/Button.tsx)
* Variants: `primary`, `secondary`, `ghost`, `danger`.
* Sizes: `sm`, `md`, `lg`.
* Strict TypeScript, fully keyboard accessible (handles focus states), inherits SVGs correctly.

#### [NEW] [Input.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/components/ui/Input.tsx)
* Text, email, and password input widget.
* Incorporates: `<label>`, hint messages, validation errors, and `aria-invalid`/`aria-describedby` accessibility attributes.
* Implemented using `React.forwardRef`.

#### [NEW] [Card.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/components/ui/Card.tsx)
* Reusable layout card container supporting slots: `header`, `body`, and `footer`.

#### [NEW] [Badge.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/components/ui/Badge.tsx)
* Semantic color pill badges (`info`, `success`, `warning`, `danger`, `neutral`).

#### [NEW] [Spinner.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/components/ui/Spinner.tsx)
* Reusable loading spinners inheriting `--accent-blue` and `--transition-fast`.

---

### Component 3: Component Tests

#### [NEW] Component Test Files
Unit tests under `src/components/ui/__tests__/`:
* `Button.test.tsx` (tests variants, clicks, sizes, and disabled states)
* `Input.test.tsx` (tests change handlers, error labels, hints, and ref passing)
* `Card.test.tsx` (tests slot rendering)
* `Badge.test.tsx` (tests semantic states mapping)
* `Spinner.test.tsx` (tests spinner loading attributes)

---

## Verification Plan

### Automated Tests
* Validate Types: `npx tsc --noEmit`
* Validate Lints: `npm run lint`
* Verify Vitest Suite (run 3 times): `npm test` (Target: 300+ passing tests)
* Production Build: `npm run build`

### Manual Verification
* Visual smoke test: Load local development server, browse to `/`, and verify that the layout and typography rendering is unchanged and contains zero regressions.
