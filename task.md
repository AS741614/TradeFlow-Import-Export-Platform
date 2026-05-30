# Task Checklist - Phase 15B: Refactor Forms and Tables to Design System Primitives

## 1. UI Primitives Creation
- [x] Create UI primitives under `src/components/ui/`
  - [x] `FormField.tsx` (generic input wrapper)
  - [x] `FormSection.tsx` (input grouping section)
  - [x] `DataTable.tsx` (generic typed data table)
  - [x] `TableActions.tsx` (bulk action drawer)
  - [x] `Modal.tsx` (native focus-trapped overlay)
  - [x] `ConfirmDialog.tsx` (native confirm popup)

## 2. Primitive Unit Tests
- [x] Create Unit Tests for Primitives under `src/components/ui/__tests__/`
  - [x] `FormField.test.tsx`
  - [x] `FormSection.test.tsx`
  - [x] `DataTable.test.tsx`
  - [x] `TableActions.test.tsx`
  - [x] `Modal.test.tsx`
  - [x] `ConfirmDialog.test.tsx`

## 3. Operations & Outreach Contacts Refactor
- [x] Refactor Operations Contacts (`src/app/operations/contacts/page.tsx`)
- [x] Refactor Outreach Contacts (`src/app/outreach/contacts/page.tsx`)

## 4. Main Operational Modules Refactor
- [x] Refactor Compliance Tracking (`src/app/operations/compliance/page.tsx`)
- [x] Refactor Inventory Catalog (`src/app/operations/inventory/page.tsx`)
- [x] Refactor Billing & Invoices (`src/app/operations/invoices/page.tsx`)
- [x] Refactor Shipments Logistics (`src/app/operations/shipments/page.tsx`)

## 5. Outreach & Campaigns Refactor
- [x] Refactor Email Campaigns (`src/app/outreach/campaigns/page.tsx`)
- [x] Refactor Email Templates (`src/app/outreach/templates/page.tsx`)

## 6. Finance & Kanban Board Refactor
- [x] Refactor Finance Overview (`src/app/finance/page.tsx`)
- [x] Refactor Projections Dashboard (`src/app/finance/projections/page.tsx`)
- [x] Refactor Margins Calculator (`src/app/finance/margins/page.tsx`)
- [x] Refactor Kanban Projects Board (`src/app/projects/page.tsx`)

## 7. Verification Gate
- [x] Type check: `npx tsc --noEmit`
- [x] Lint checks: `npm run lint`
- [x] Unit & Integration tests (run 3 times): `npm test`
- [x] Production build: `npm run build`
- [x] Conventional Commit & push
