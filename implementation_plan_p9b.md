# Implementation Plan - Migrating UI Components to Async Storage (Prompt 9b)

This plan outlines the migration of TradeFlow's UI component layer from synchronous storage access to asynchronous, Promise-based storage access. It maps out the replacement of synchronous calls with React `useEffect` data loading and async/await event handlers, and replaces bulk `setItems` calls with clean RESTful operations.

## User Review Required

> [!IMPORTANT]
> **Zero Component File Failures**: After implementing this plan, the application will build successfully (`npm run build`) and TypeScript types will compile clean (`npx tsc --noEmit` will return 0 errors).
>
> **setItems Refactoring (Category B)**: All bulk `setItems` calls are successfully refactored into RESTful `addItem`, `updateItem`, and `removeItem` calls, avoiding bulk synchronize anti-patterns and maintaining PostgreSQL table boundaries.
>
> **bp_last_saved getValue/setValue Deferred**: As instructed, the persistence of the last saved time for the business plan is deferred to Prompt 9.1. We will mock/stub this value locally using react state and the resolved Promise default values in the UI for now.

## Open Questions

There are no remaining open questions. The scope and constraints are fully defined.

## Proposed Changes

### UI Support Components

#### [NEW] [Loading.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/components/Loading.tsx)
- Implements a reusable, visually clean `<Loading />` indicator component for pages while they are in flight retrieving data from the backend APIs.

#### [NEW] [ErrorBanner.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/components/ErrorBanner.tsx)
- Implements a reusable `<ErrorBanner message={error} />` component to render error messages inline on page layouts when an API call fails.

---

### Component & Page Refactorings

#### [MODIFY] [page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/page.tsx) (Dashboard)
- **Data Load**: Convert to `useEffect` pattern. Use endpoints `'products'`, `'contacts'`, `'tasks'`, `'shipments'`, `'invoices'`, and `'campaigns'`.
- **Category A Seeding**: Check if products, contacts, and tasks are empty. If so, sequentially call `addItem` for each seed.
- **Loading & Error**: Show `<Loading />` and `<ErrorBanner />` inline.

#### [MODIFY] [page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/business-plan/page.tsx) (Business Plan)
- **Data Load**: Fetch `'business-plan'` and `'swot'` in a `useEffect`.
- **Category A Seeding**: Seed defaults via sequential `addItem` calls if empty.
- **Category B Refactoring**:
  - `saveSections` -> Call `updateItem('business-plan', sectionId, { content: newText })` directly when typing.
  - `saveSwot` -> Replace with `addItem('swot', newItem)` and `removeItem('swot', id)`.
- **bp_last_saved**: Await the stubbed `getValue` inside `useEffect` and set last saved state.

#### [MODIFY] [page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/finance/page.tsx) (Finance Overview)
- **Data Load**: Fetch `'cost-items'` and `'financial-projections'` via `useEffect` and run `computeMetrics` on load.
- **Loading & Error**: Implement inline state.

#### [MODIFY] [page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/finance/projections/page.tsx) (P&L Projections)
- **Data Load**: Fetch `'financial-projections'` via `useEffect`.
- **Category B Refactoring**: Replace the `persist` helper with:
  - Add: `addItem('financial-projections', newItem)`
  - Edit: `updateItem('financial-projections', editingId, updates)`
  - Delete: `removeItem('financial-projections', id)`

#### [MODIFY] [page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/operations/compliance/page.tsx) (Compliance Checklist)
- **Data Load**: Fetch `'compliance'` and `'shipments'` in parallel.
- **Category A Seeding**: Seed default checklist items using `addItem` if the retrieved compliance items count is 0.
- **Mutations**: Await `addItem`, `updateItem`, and `removeItem` using `'compliance'` endpoint.

#### [MODIFY] [page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/operations/contacts/page.tsx) (Contacts Directory)
- **Data Load**: Fetch `'contacts'` via `useEffect`.
- **Mutations**: Await `addItem`, `updateItem`, and `removeItem` using `'contacts'` endpoint.

#### [MODIFY] [page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/operations/inventory/page.tsx) (Inventory Catalogue)
- **Data Load**: Fetch `'products'` via `useEffect`.
- **Mutations**: Await `addItem`, `updateItem`, and `removeItem` using `'products'` endpoint.

#### [MODIFY] [page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/operations/invoices/page.tsx) (Billing Invoices)
- **Data Load**: Fetch `'invoices'` and `'contacts'` via `useEffect`.
- **Mutations**: Await `addItem`, `updateItem`, and `removeItem` using `'invoices'` endpoint.

#### [MODIFY] [page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/operations/shipments/page.tsx) (Shipments Pipeline)
- **Data Load**: Fetch `'shipments'` and `'products'` via `useEffect`.
- **Mutations**: Await `addItem`, `updateItem`, and `removeItem` using `'shipments'` endpoint.

#### [MODIFY] [page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/outreach/page.tsx) (Outreach Home)
- **Data Load**: Fetch `'outreach-contacts'`, `'email-templates'`, and `'campaigns'` via `useEffect`.
- **Loading & Error**: Show simple loading states.

#### [MODIFY] [page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/outreach/campaigns/page.tsx) (Outreach Campaigns)
- **Data Load**: Fetch `'campaigns'`, `'email-templates'`, and `'outreach-contacts'` via `useEffect`.
- **Mutations**:
  - `handleLaunchCampaign` -> Await `addItem('campaigns', newCampaign)`.
  - `runCampaignSimulation` -> Await `runCampaignSimulation(id)`.
  - `handleDeleteCampaign` -> Await `removeItem('campaigns', id)`.

#### [MODIFY] [page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/outreach/contacts/page.tsx) (Outreach Contacts Directory)
- **Data Load**: Fetch `'outreach-contacts'` via `useEffect`.
- **Mutations**:
  - `processUploadedFile` -> Read, then iterate over imported items and await `addItem('outreach-contacts', item)`.
  - `handleAddManual` -> Await `addItem('outreach-contacts', newContact)`.
  - `handleBulkDelete` -> Sequentially await `removeItem('outreach-contacts', id)` for selected items.

#### [MODIFY] [page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/outreach/templates/page.tsx) (Outreach Templates)
- **Data Load**: Fetch `'email-templates'` via `useEffect`.
- **Category A Seeding**: Seed defaults via sequential `addItem('email-templates', item)` if empty.
- **Mutations**: Await `addItem`, `updateItem`, and `removeItem` using `'email-templates'` endpoint.

#### [MODIFY] [page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/outreach/tracking/page.tsx) (Outreach Analytics)
- **Data Load**: Fetch `'campaigns'` via `useEffect`.

#### [MODIFY] [page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/projects/page.tsx) (Kanban Board)
- **Data Load**: Fetch `'tasks'` via `useEffect`.
- **Category A Seeding**: Seed default tasks via sequential `addItem` if empty.
- **Category B Refactoring**:
  - `handleDrop` -> Replace the bulk `setItems` call with `await updateItem<Task>('tasks', taskId, { status: targetStatus, updatedAt: nowISO() })`.
  - `handleAddTask` -> Await `addItem<Task>('tasks', newTask)`.

---

## Detailed setItems Call Sites Refactoring

Below is the classification and exact proposed replacement code for each of the 12 `setItems` call sites across the 6 files:

### 1. `src/app/page.tsx`

*   **Call Site 1 (Line 36)**
    *   *Current Code*: `setItems(STORAGE_KEYS.PRODUCTS, samples);`
    *   *Category*: Category A (Initial seeding)
    *   *Proposed Replacement*:
        ```typescript
        const productsData = await getItems<Product>('products');
        if (productsData.length === 0) {
          const samples = getSampleProducts();
          for (const item of samples) {
            await addItem<Product>('products', item);
          }
        }
        ```
*   **Call Site 2 (Line 43)**
    *   *Current Code*: `setItems(STORAGE_KEYS.CONTACTS, samples);`
    *   *Category*: Category A (Initial seeding)
    *   *Proposed Replacement*:
        ```typescript
        const contactsData = await getItems<Contact>('contacts');
        if (contactsData.length === 0) {
          const samples = getSampleContacts();
          for (const item of samples) {
            await addItem<Contact>('contacts', item);
          }
        }
        ```
*   **Call Site 3 (Line 50)**
    *   *Current Code*: `setItems(STORAGE_KEYS.TASKS, defaults);`
    *   *Category*: Category A (Initial seeding)
    *   *Proposed Replacement*:
        ```typescript
        const tasksData = await getItems<Task>('tasks');
        if (tasksData.length === 0) {
          const defaults = getDefaultTasks();
          for (const item of defaults) {
            await addItem<Task>('tasks', item);
          }
        }
        ```

### 2. `src/app/business-plan/page.tsx`

*   **Call Site 4 (Line 14)**
    *   *Current Code*: `setItems(STORAGE_KEYS.BUSINESS_PLAN, defaults);`
    *   *Category*: Category A (Initial seeding)
    *   *Proposed Replacement*:
        ```typescript
        const loadedSections = await getItems<BusinessPlanSection>('business-plan');
        if (loadedSections.length === 0) {
          const defaults = getDefaultBusinessPlan();
          for (const item of defaults) {
            await addItem<BusinessPlanSection>('business-plan', item);
          }
        }
        ```
*   **Call Site 5 (Line 23)**
    *   *Current Code*: `setItems(STORAGE_KEYS.SWOT, defaults);`
    *   *Category*: Category A (Initial seeding)
    *   *Proposed Replacement*:
        ```typescript
        const loadedSwot = await getItems<SwotItem>('swot');
        if (loadedSwot.length === 0) {
          const defaults = getDefaultSwotItems();
          for (const item of defaults) {
            await addItem<SwotItem>('swot', item);
          }
        }
        ```
*   **Call Site 6 (Line 47)**
    *   *Current Code*: `setItems(STORAGE_KEYS.BUSINESS_PLAN, updatedSections);`
    *   *Category*: Category B (Bulk replace)
    *   *Proposed Replacement*: Remove `saveSections` bulk save. In `handleSectionTextChange`, update the single edited section directly:
        ```typescript
        const handleSectionTextChange = async (sectionId: string, newText: string) => {
          try {
            const fresh = await updateItem<BusinessPlanSection>('business-plan', sectionId, { content: newText });
            setSections(fresh.sort((a, b) => a.order - b.order));
            setLastSaved(nowISO());
          } catch (err) {
            setError('Failed to save document section');
          }
        };
        ```
*   **Call Site 7 (Line 56)**
    *   *Current Code*: `setItems(STORAGE_KEYS.SWOT, updatedSwot);`
    *   *Category*: Category B (Bulk replace)
    *   *Proposed Replacement*: Remove `saveSwot` bulk save. Call specific RESTful mutations in event handlers:
        *   On Add SWOT:
            ```typescript
            const handleAddSwotItem = async (text: string, category: SwotItem['category']) => {
              // ... validations ...
              const newItem = { id: generateId(), text: text.trim(), category };
              const fresh = await addItem<SwotItem>('swot', newItem);
              setSwotItems(fresh);
              setLastSaved(nowISO());
            };
            ```
        *   On Delete SWOT:
            ```typescript
            const handleDeleteSwotItem = async (id: string) => {
              const fresh = await removeItem<SwotItem>('swot', id);
              setSwotItems(fresh);
              setLastSaved(nowISO());
            };
            ```

### 3. `src/app/finance/projections/page.tsx`

*   **Call Site 8 (Line 27)**
    *   *Current Code*: `setItems(STORAGE_KEYS.PROJECTIONS, items);`
    *   *Category*: Category B (Bulk replace)
    *   *Proposed Replacement*: Replace `persist` helper with direct RESTful calls:
        *   In `handleSave` (Add):
            ```typescript
            const newItem: FinancialProjection = { id: generateId(), month: formMonth, revenue, expenses, profit, currency: 'USD' };
            const fresh = await addItem<FinancialProjection>('financial-projections', newItem);
            setProjections(fresh);
            ```
        *   In `handleSave` (Edit):
            ```typescript
            const fresh = await updateItem<FinancialProjection>('financial-projections', editingId, { month: formMonth, revenue, expenses, profit });
            setProjections(fresh);
            ```
        *   In `handleDelete`:
            ```typescript
            const fresh = await removeItem<FinancialProjection>('financial-projections', id);
            setProjections(fresh);
            ```

### 4. `src/app/operations/compliance/page.tsx`

*   **Call Site 9 (Line 63)**
    *   *Current Code*: `setItems(STORAGE_KEYS.COMPLIANCE, defaults);`
    *   *Category*: Category A (Initial seeding)
    *   *Proposed Replacement*:
        ```typescript
        const storedCompliance = await getItems<ComplianceItem>('compliance');
        if (storedCompliance.length === 0) {
          // ... define defaults and shipment associations ...
          for (const item of defaults) {
            await addItem<ComplianceItem>('compliance', item);
          }
        }
        ```

### 5. `src/app/outreach/templates/page.tsx`

*   **Call Site 10 (Line 70)**
    *   *Current Code*: `setItems(STORAGE_KEYS.EMAIL_TEMPLATES, seeded);`
    *   *Category*: Category A (Initial seeding)
    *   *Proposed Replacement*:
        ```typescript
        const stored = await getItems<EmailTemplate>('email-templates');
        if (stored.length === 0) {
          // ... construct seeded templates ...
          for (const item of seeded) {
            await addItem<EmailTemplate>('email-templates', item);
          }
        }
        ```

### 6. `src/app/projects/page.tsx`

*   **Call Site 11 (Line 99)**
    *   *Current Code*: `setItems(STORAGE_KEYS.TASKS, defaults);`
    *   *Category*: Category A (Initial seeding)
    *   *Proposed Replacement*:
        ```typescript
        const stored = await getItems<Task>('tasks');
        if (stored.length === 0) {
          const defaults = getDefaultTasks();
          for (const item of defaults) {
            await addItem<Task>('tasks', item);
          }
        }
        ```
*   **Call Site 12 (Line 156)**
    *   *Current Code*: `setItems(STORAGE_KEYS.TASKS, updated);`
    *   *Category*: Category B (Bulk replace)
    *   *Proposed Replacement*: Refactor task drop to update the target status of the single dragged task:
        ```typescript
        const handleDrop = useCallback(
          async (e: DragEvent<HTMLDivElement>, targetStatus: TaskStatus) => {
            e.preventDefault();
            const taskId = e.dataTransfer.getData('text/plain');
            if (!taskId) return;

            try {
              const fresh = await updateItem<Task>('tasks', taskId, { status: targetStatus, updatedAt: nowISO() });
              setTasks(fresh);
            } catch (err) {
              setError(err instanceof StorageError ? err.message : 'Failed to update task status');
            }
            setDraggingId(null);
            setDragOverColumn(null);
          },
          []
        );
        ```

---

## Verification Plan

### Automated Tests
- Run Vitest to verify all 194 unit and integration tests are passing:
  `npm test`
- Run type check to ensure zero TypeScript compiler compilation failures across the entire codebase:
  `npx tsc --noEmit`
- Run linting checks to ensure code compliance:
  `npm run lint`
- Build the production bundle successfully:
  `npm run build`

### Manual Verification
- Deploy local dev server (`npm run dev`) and manually walk through the UI:
  1. Add a contact in the Operations Contacts directory.
  2. Refresh the browser and verify the contact remains.
  3. Drag a task on the Kanban board and verify its status is saved to the backend on refresh.
  4. Perform SWOT modifications and verify changes persist after refresh.
