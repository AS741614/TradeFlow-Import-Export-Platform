# TradeFlow Coding Agent Directives — AGENTS.md

Welcome to the TradeFlow Import-Export platform repository. If you are an AI coding assistant, developer agent, or automatic review system, you MUST conform to the rules and mappings outlined below.

---

## 🛠️ Codebase Stack & Constraints

1. **Framework & Setup**:
   - Built on Next.js 16 (React 19) utilizing the App Router directory structure under `src/app/`.
   - Written in highly strict TypeScript. Do not bypass compile-time checks or use `any`.

2. **Styling Rules**:
   - Styling is strictly centralized in [globals.css](file:///src/app/globals.css).
   - Do NOT add Tailwind CSS packages or write custom CSS modules (`.module.css`).
   - Re-use established CSS custom properties for gradients, cards, forms, metrics, and list staggered entries.

3. **Client-Side State Persistence**:
   - The application does not connect to an active SQL/NoSQL backend database.
   - Utilize [storage.ts](file:///src/lib/storage.ts) API commands (`getItems`, `addItem`, `updateItem`, `removeItem`) to read/write state with browser `localStorage`.
   - Never modify or write custom keys without appending them to the `STORAGE_KEYS` object definition inside `src/lib/storage.ts`.

4. **Testing & Test IDs**:
   - For browser testing, automation, and UI checks, all interactive components (buttons, links, inputs, selectors, and submit triggers) must contain a unique `id` attribute.

---

## 📂 Core Library Modules

- [types.ts](file:///src/lib/types.ts) — Blueprint interfaces for models.
- [storage.ts](file:///src/lib/storage.ts) — Data retrieval and deletion.
- [constants.ts](file:///src/lib/constants.ts) — Dropdowns arrays (Countries, Incoterms, product categories) and seed generators.
- [utils.ts](file:///src/lib/utils.ts) — Helper formulas for dates, currencies, and formatting text.
- [importers.ts](file:///src/lib/importers.ts) — CSV parse mapping arrays.
- [templateEngine.ts](file:///src/lib/templateEngine.ts) — Token substitution handlers.
- [email.ts](file:///src/lib/email.ts) — Simulation runner generating outreach funnel statistics.

---

## 🤖 Workflow Rules for Agents

- **Modifications**: Retain existing docstrings and code comments unless explicitly updating the associated logic.
- **Verification**: Run `npm run build` and `npx tsc --noEmit` locally before finalizing any code edits to ensure zero static-type failures.
- **Git Commits**: Write git commits conforming to Conventional Commits standards (e.g. `feat:`, `fix:`, `refactor:`, `style:`).
