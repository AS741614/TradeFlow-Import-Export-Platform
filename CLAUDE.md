# TradeFlow Project Guide — CLAUDE.md

Quick reference for commands, styling conventions, and rules when editing the TradeFlow project.

## 🚀 Build & Development Commands
- **Start Local Server**: `npm run dev`
- **Build Production Bundle**: `npm run build`
- **Verify TypeScript Compilation**: `npx tsc --noEmit`

## 🎨 Code Style & Styling Conventions
- **Style Constraints**: All CSS rules are located in [globals.css](file:///src/app/globals.css). Do not import Tailwind CSS, separate modular stylesheets, or CSS-in-JS libraries. Leverage the predefined CSS variable system (`--accent-blue`, `--bg-secondary`, `--radius-lg`, etc.).
- **Typography & Icons**: Use the Inter font family. Write clean, inline SVGs with standard paths and no hardcoded dimensions (let the global CSS `svg` rules size and stroke them).
- **TypeScript**: Strictly type-safe code. Avoid using `any`. Create new models or types directly inside [types.ts](file:///src/lib/types.ts) if necessary.

## 🧠 Architecture Principles
- **Data Persistence**: Local Storage first. Always read and write using [storage.ts](file:///src/lib/storage.ts) wrappers to keep client-side updates fluid.
- **Interactivity**: Mark stateful templates with `'use client';`. Ensure all buttons, forms, selects, and links have unique, descriptive `id` attributes.
- **Commit Format**: Use conventional commits (e.g. `feat: add ...`, `fix: resolve ...`, `style: update css ...`).
