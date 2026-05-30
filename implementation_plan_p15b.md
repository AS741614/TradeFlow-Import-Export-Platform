# Implementation Plan - Phase 15B: Refactor Forms and Tables to Design System Primitives

This plan describes the creation of six new shared UI primitives (`FormField`, `FormSection`, `DataTable`, `TableActions`, `Modal`, `ConfirmDialog`) and the subsequent refactoring of all TradeFlow list pages, modals, and input forms to use these shared patterns.

---

## User Review Required

> [!IMPORTANT]
> - **Native Modals Focus-Trap & Scroll-Lock**: The new `Modal` component implements focus-trapping (retaining keyboard focus cycling inside the overlay), escape key dismissing, and background body scroll locking natively without any external npm packages.
> - **Surgical Refactoring approach**: Refactoring will be done incrementally. We will first refactor the `Contacts` listing page and modals, run full regression tests, and then roll out the component replacements across the remaining 12 modules.
> - **Keyboard Shortcuts**: Existing tab indexes and keyboard navigation flow will be preserved or improved (due to modal focus trapping).
> - **No State or Logical Changes**: All API wrappers, client state hooks, sorting handlers, filters, bulk deletion triggers, and validations remain functionally identical. Only presentation layout containers and repetitive inline table/form elements are refactored.

---

## Proposed Changes

### Component 1: New UI Layout Primitives

#### [NEW] [FormField.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/components/ui/FormField.tsx)
Generic layout wrapper block linking a label, form control input (supports `<input>`, `<select>`, `<textarea>`), helper description hint, and validation error message. Injects descriptive aria attributes (`aria-describedby`, `aria-invalid`) dynamically.

#### [NEW] [FormSection.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/components/ui/FormSection.tsx)
Grouped fields panel displaying a section header, short description text, and visual stack for nested fields.

#### [NEW] [DataTable.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/components/ui/DataTable.tsx)
A generic typed React table rendering columns, sorting visual tags on headers, custom row cell rendering, bulk selection checkboxes, empty listings states, loading indicators, and pagination footing.

#### [NEW] [TableActions.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/components/ui/TableActions.tsx)
Floating context actions bar displaying item selection counts and action trigger buttons (e.g. bulk-delete triggers) when rows are selected.

#### [NEW] [Modal.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/components/ui/Modal.tsx)
Main popup overlay handling blurred backdrops, backdrop-intercepts, escape key handlers, background scroll locking, and strict tab index focus traps.

#### [NEW] [ConfirmDialog.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/components/ui/ConfirmDialog.tsx)
Confirmation dialog modal offering standard action hooks (Cancel, Confirm) and color themes (primary or danger-alert).

---

### Component 2: Primitive Unit Tests

#### [NEW] [FormField.test.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/components/ui/__tests__/FormField.test.tsx)
Tests input cloning, class injection (`form-select`, `form-input`), and label-error mapping.

#### [NEW] [FormSection.test.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/components/ui/__tests__/FormSection.test.tsx)
Verifies title and description output.

#### [NEW] [DataTable.test.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/components/ui/__tests__/DataTable.test.tsx)
Tests record listing, custom render functions, header checkbox triggers, and loading spinners.

#### [NEW] [TableActions.test.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/components/ui/__tests__/TableActions.test.tsx)
Verifies action button rendering and selection count messages.

#### [NEW] [Modal.test.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/components/ui/__tests__/Modal.test.tsx)
Tests mounting states, overlay close handlers, Escape key listener binds, and scroll overflow toggles.

#### [NEW] [ConfirmDialog.test.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/components/ui/__tests__/ConfirmDialog.test.tsx)
Verifies header text, message text, and button click calls.

---

### Component 3: Phase Refactor Checklist

We will apply the refactoring in the following exact sequence:

#### Step 1: Proof of Parity (Contacts)
- **Operations Contacts**: Refactor [src/app/operations/contacts/page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/operations/contacts/page.tsx) replacing the list grid card, add/edit modal, and form inputs.
- **Outreach Contacts**: Refactor [src/app/outreach/contacts/page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/outreach/contacts/page.tsx) replacing the main data table, selection checkboxes, TableActions panel, mapper panels, and add manual contact dialog.
- **Verify**: Type check, lint, and run tests.

#### Step 2: Main Operational Modules
- **Compliance Tracking**: Refactor [src/app/operations/compliance/page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/operations/compliance/page.tsx) (Table, Modal, FormFields).
- **Inventory Catalog**: Refactor [src/app/operations/inventory/page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/operations/inventory/page.tsx) (Table, Modal, FormFields).
- **Billing & Invoices**: Refactor [src/app/operations/invoices/page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/operations/invoices/page.tsx) (Main Table, Modal, sub-items sub-table, FormFields).
- **Shipments Logistics**: Refactor [src/app/operations/shipments/page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/operations/shipments/page.tsx) (Modal, Manifest cargo sub-table, FormFields).

#### Step 3: Outreach & Campaigns Modules
- **Email Campaigns**: Refactor [src/app/outreach/campaigns/page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/outreach/campaigns/page.tsx) (Wizard step layout, target contact selector checkbox table, FormFields).
- **Email Templates**: Refactor [src/app/outreach/templates/page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/outreach/templates/page.tsx) (Compose Modal columns editor, FormFields).

#### Step 4: Financial Projections & Kanban Board
- **Projections Dashboard**: Refactor [src/app/finance/page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/finance/page.tsx) (Recent Costs Table), [src/app/finance/projections/page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/finance/projections/page.tsx) (Projections Table, editing panel FormFields), and [src/app/finance/margins/page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/finance/margins/page.tsx) (Calculator FormFields).
- **Kanban Board**: Refactor [src/app/projects/page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/projects/page.tsx) (Add Task Form-wrapped Modal, FormFields).

---

## Verification Plan

### Automated Tests
- Type checking: `npx tsc --noEmit`
- Linter checks: `npm run lint`
- Test Suite (run 3 times): `npm test` (Target: **330+ passing tests** by writing 25+ new tests for form/modal/table wrappers)
- Production build: `npm run build`

### Manual Verification
- Start local development server: `npm run dev`
- Load `/operations/contacts` and `/outreach/contacts` to verify layout consistency, click operations, search filters, and bulk delete operations.
