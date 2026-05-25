# Implementation Plan — Hydration Correction & Governance Pass

This plan details the corrective changes to eliminate the `setTimeout(..., 0)` mount hydration wrappers, restore storage generic type signatures, document the `tsconfig.json` scope audit, and patch governance documentation to prevent audit-trail deletions.

---

## 1. Governance Patch Verbatim Text

We will add a new bullet under **Section 7: Scope Discipline** in `AGENTS.md`, duplicate it exactly in `CLAUDE.md`, and add a corresponding entry to `.cursorrules`.

### Verbatim bullet for [AGENTS.md](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/AGENTS.md) and [CLAUDE.md](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/CLAUDE.md):
```markdown
- **Audit-trail file preservation**: NEVER `rm` or delete files matching `implementation_plan*.md`, `walkthrough*.md`, or `task*.md` from the repository root. These document the partnership decision history. Before any cleanup or `rm` operation, check filenames against this pattern. If a plan file appears stale, MOVE it to `docs/history/` rather than deleting. Cleanup commands like `rm -f *.md` are forbidden in the repo root regardless of glob.
```

### Verbatim bullet for [.cursorrules](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/.cursorrules):
```
  - Never delete implementation_plan*.md / walkthrough*.md / task*.md. Move to docs/history/ instead. No rm in repo root.
```

---

## 2. Storage Generics Restoration

We will restore the `<T>` generics to `setItems` and `setValue` in [src/lib/storage.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/storage.ts). Inline comments will be added to override `@typescript-eslint/no-unnecessary-type-parameters`.

### Proposed [src/lib/storage.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/storage.ts#L31-L41) (setItems):
```typescript
/**
 * Save entire collection to localStorage.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function setItems<T>(key: string, items: T[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(items));
  } catch (e) {
    console.error(`Failed to save to localStorage key: ${key}`, e);
  }
}
```

### Proposed [src/lib/storage.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/storage.ts#L91-L101) (setValue):
```typescript
/**
 * Set a single value (non-array) in localStorage.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function setValue<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to save value to localStorage key: ${key}`, e);
  }
}
```

---

## 3. Hydration Refactoring (File-by-File)

All 15 targeted components have `'use client';` declared at the top of their page files.

### 1. [src/app/business-plan/page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/business-plan/page.tsx)
*   **Current code**:
    ```typescript
    useEffect(() => {
      let loadedSections = getItems<BusinessPlanSection>(STORAGE_KEYS.BUSINESS_PLAN);
      if (loadedSections.length === 0) { ... }
      const sortedSections = loadedSections.sort((a, b) => a.order - b.order);
      // ...
      setTimeout(() => {
        setSections(sortedSections);
        if (firstTabId) setActiveTab(firstTabId);
        setSwotItems(loadedSwot);
        setLastSaved(savedTime);
        setInitialized(true);
      }, 0);
    }, []);
    ```
*   **Refactored State Initializers**:
    ```typescript
    const [sections, setSections] = useState<BusinessPlanSection[]>(() => {
      let loadedSections = getItems<BusinessPlanSection>(STORAGE_KEYS.BUSINESS_PLAN);
      if (loadedSections.length === 0) {
        const defaults = getDefaultBusinessPlan();
        setItems(STORAGE_KEYS.BUSINESS_PLAN, defaults);
        loadedSections = defaults;
      }
      return loadedSections.sort((a, b) => a.order - b.order);
    });
    const [swotItems, setSwotItems] = useState<SwotItem[]>(() => {
      let loadedSwot = getItems<SwotItem>(STORAGE_KEYS.SWOT);
      if (loadedSwot.length === 0) {
        const defaults = getDefaultSwotItems();
        setItems(STORAGE_KEYS.SWOT, defaults);
        loadedSwot = defaults;
      }
      return loadedSwot;
    });
    const [activeTab, setActiveTab] = useState<string>(() => {
      const loadedSections = getItems<BusinessPlanSection>(STORAGE_KEYS.BUSINESS_PLAN);
      const sorted = loadedSections.sort((a, b) => a.order - b.order);
      return sorted[0]?.id ?? '';
    });
    const [lastSaved, setLastSaved] = useState<string>(() => getValue<string>('bp_last_saved', nowISO()));
    ```
*   **Effect Disposition**: Keep partially (only set `initialized` on mount).
    ```typescript
    useEffect(() => {
      setInitialized(true);
    }, []);
    ```

---

### 2. [src/app/finance/page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/finance/page.tsx)
*   **Current code**:
    ```typescript
    useEffect(() => {
      const items = getItems<CostItem>(STORAGE_KEYS.COST_ITEMS);
      const projections = getItems<FinancialProjection>(STORAGE_KEYS.PROJECTIONS);
      const computed = computeMetrics(items, projections);
      setTimeout(() => {
        setCostItems(items);
        setMetrics(computed);
        setReady(true);
      }, 0);
    }, []);
    ```
*   **Refactored State Initializers**:
    ```typescript
    const [costItems, setCostItems] = useState<CostItem[]>(() => getItems<CostItem>(STORAGE_KEYS.COST_ITEMS));
    const [metrics, setMetrics] = useState<FinanceMetrics>(() => {
      const items = getItems<CostItem>(STORAGE_KEYS.COST_ITEMS);
      const projections = getItems<FinancialProjection>(STORAGE_KEYS.PROJECTIONS);
      return computeMetrics(items, projections);
    });
    ```
*   **Effect Disposition**: Keep partially (only set `ready` on mount).
    ```typescript
    useEffect(() => {
      setReady(true);
    }, []);
    ```

---

### 3. [src/app/finance/projections/page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/finance/projections/page.tsx)
*   **Current code**:
    ```typescript
    useEffect(() => {
      const data = getItems<FinancialProjection>(STORAGE_KEYS.PROJECTIONS);
      setTimeout(() => {
        setProjections(data);
        setReady(true);
      }, 0);
    }, []);
    ```
*   **Refactored State Initializers**:
    ```typescript
    const [projections, setProjections] = useState<FinancialProjection[]>(() => getItems<FinancialProjection>(STORAGE_KEYS.PROJECTIONS));
    ```
*   **Effect Disposition**: Keep partially (only set `ready` on mount).
    ```typescript
    useEffect(() => {
      setReady(true);
    }, []);
    ```

---

### 4. [src/app/operations/compliance/page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/operations/compliance/page.tsx)
*   **Current code**:
    ```typescript
    useEffect(() => {
      // (Loads & Seeds storedCompliance if empty)
      setTimeout(() => {
        setShipments(storedShipments);
        setComplianceItems(storedCompliance);
        setInitialized(true);
      }, 0);
    }, []);
    ```
*   **Refactored State Initializers**:
    ```typescript
    const [shipments, setShipments] = useState<Shipment[]>(() => getItems<Shipment>(STORAGE_KEYS.SHIPMENTS));
    const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>(() => {
      let storedCompliance = getItems<ComplianceItem>(STORAGE_KEYS.COMPLIANCE);
      const storedShipments = getItems<Shipment>(STORAGE_KEYS.SHIPMENTS);
      if (storedCompliance.length === 0) {
        const now = nowISO().split('T')[0] ?? '';
        const defaults: ComplianceItem[] = [
          {
            id: generateId(),
            documentName: 'Export Customs Declaration',
            documentType: 'customs-declaration',
            status: 'pending',
            requiredBy: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] ?? '',
            notes: 'Required for cargo clearance at local custom port.',
          },
          {
            id: generateId(),
            documentName: 'Commercial Invoice & Packing List',
            documentType: 'commercial-invoice',
            status: 'approved',
            requiredBy: now,
            notes: 'Completed and verified by trade operations manager.',
          },
        ];
        const d0 = defaults[0];
        const d1 = defaults[1];
        const s0 = storedShipments[0];
        if (d0 && d1 && s0) {
          d0.shipmentId = s0.id;
          d1.shipmentId = s0.id;
        }
        defaults.forEach((item) => addItem(STORAGE_KEYS.COMPLIANCE, item));
        storedCompliance = defaults;
      }
      return storedCompliance;
    });
    ```
*   **Effect Disposition**: Keep partially (only set `initialized` on mount).
    ```typescript
    useEffect(() => {
      setInitialized(true);
    }, []);
    ```

---

### 5. [src/app/operations/contacts/page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/operations/contacts/page.tsx)
*   **Current code**:
    ```typescript
    useEffect(() => {
      const data = getItems<Contact>(STORAGE_KEYS.CONTACTS);
      setTimeout(() => {
        setContacts(data);
        setInitialized(true);
      }, 0);
    }, []);
    ```
*   **Refactored State Initializers**:
    ```typescript
    const [contacts, setContacts] = useState<Contact[]>(() => getItems<Contact>(STORAGE_KEYS.CONTACTS));
    ```
*   **Effect Disposition**: Keep partially (only set `initialized` on mount).
    ```typescript
    useEffect(() => {
      setInitialized(true);
    }, []);
    ```

---

### 6. [src/app/operations/inventory/page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/operations/inventory/page.tsx)
*   **Current code**:
    ```typescript
    useEffect(() => {
      const data = getItems<Product>(STORAGE_KEYS.PRODUCTS);
      setTimeout(() => {
        setProducts(data);
        setInitialized(true);
      }, 0);
    }, []);
    ```
*   **Refactored State Initializers**:
    ```typescript
    const [products, setProducts] = useState<Product[]>(() => getItems<Product>(STORAGE_KEYS.PRODUCTS));
    ```
*   **Effect Disposition**: Keep partially (only set `initialized` on mount).
    ```typescript
    useEffect(() => {
      setInitialized(true);
    }, []);
    ```

---

### 7. [src/app/operations/invoices/page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/operations/invoices/page.tsx)
*   **Current code**:
    ```typescript
    useEffect(() => {
      const loadedInvoices = getItems<Invoice>(STORAGE_KEYS.INVOICES);
      const loadedContacts = getItems<Contact>(STORAGE_KEYS.CONTACTS);
      setTimeout(() => {
        setInvoices(loadedInvoices);
        setContacts(loadedContacts);
        setInitialized(true);
      }, 0);
    }, []);
    ```
*   **Refactored State Initializers**:
    ```typescript
    const [invoices, setInvoices] = useState<Invoice[]>(() => getItems<Invoice>(STORAGE_KEYS.INVOICES));
    const [contacts, setContacts] = useState<Contact[]>(() => getItems<Contact>(STORAGE_KEYS.CONTACTS));
    ```
*   **Effect Disposition**: Keep partially (only set `initialized` on mount).
    ```typescript
    useEffect(() => {
      setInitialized(true);
    }, []);
    ```

---

### 8. [src/app/operations/shipments/page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/operations/shipments/page.tsx)
*   **Current code**:
    ```typescript
    useEffect(() => {
      const loadedShipments = getItems<Shipment>(STORAGE_KEYS.SHIPMENTS);
      const loadedProducts = getItems<Product>(STORAGE_KEYS.PRODUCTS);
      setTimeout(() => {
        setShipments(loadedShipments);
        setProducts(loadedProducts);
        setInitialized(true);
      }, 0);
    }, []);
    ```
*   **Refactored State Initializers**:
    ```typescript
    const [shipments, setShipments] = useState<Shipment[]>(() => getItems<Shipment>(STORAGE_KEYS.SHIPMENTS));
    const [products, setProducts] = useState<Product[]>(() => getItems<Product>(STORAGE_KEYS.PRODUCTS));
    ```
*   **Effect Disposition**: Keep partially (only set `initialized` on mount).
    ```typescript
    useEffect(() => {
      setInitialized(true);
    }, []);
    ```

---

### 9. [src/app/outreach/campaigns/page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/outreach/campaigns/page.tsx)
*   **Current code (Mount Effect)**:
    ```typescript
    useEffect(() => {
      const loadedCampaigns = getItems<Campaign>(STORAGE_KEYS.CAMPAIGNS);
      const loadedTemplates = getItems<EmailTemplate>(STORAGE_KEYS.EMAIL_TEMPLATES);
      const loadedContacts = getItems<OutreachContact>(STORAGE_KEYS.OUTREACH_CONTACTS);
      setTimeout(() => {
        setCampaigns(loadedCampaigns);
        setTemplates(loadedTemplates);
        setContacts(loadedContacts);
        setInitialized(true);
      }, 0);
    }, []);
    ```
*   **Refactored State Initializers**:
    ```typescript
    const [campaigns, setCampaigns] = useState<Campaign[]>(() => getItems<Campaign>(STORAGE_KEYS.CAMPAIGNS));
    const [templates, setTemplates] = useState<EmailTemplate[]>(() => getItems<EmailTemplate>(STORAGE_KEYS.EMAIL_TEMPLATES));
    const [contacts, setContacts] = useState<OutreachContact[]>(() => getItems<OutreachContact>(STORAGE_KEYS.OUTREACH_CONTACTS));
    ```
*   **Effect Disposition**: Keep partially (only set `initialized` on mount).
    ```typescript
    useEffect(() => {
      setInitialized(true);
    }, []);
    ```
*   **Special Case (`outreach/campaigns/page.tsx:153`)**:
    ```typescript
    if (wizard.scheduleType === 'immediate') {
      runCampaignSimulation(newCampaign.id);
      setTimeout(() => {
        setCampaigns(getItems<Campaign>(STORAGE_KEYS.CAMPAIGNS));
      }, 2000);
    }
    ```
    *   **Verdict**: **KEEP AS IS**.
    *   **Justification**: This timer does not bypass mount-time linter rules or handle component hydration. It is an intentional 2-second asynchronous wait that allows the simulation engine to modify records inside the mock database, after which it refreshes UI campaign statistics.

---

### 10. [src/app/outreach/contacts/page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/outreach/contacts/page.tsx)
*   **Current code**:
    ```typescript
    useEffect(() => {
      const loadedContacts = getItems<OutreachContact>(STORAGE_KEYS.OUTREACH_CONTACTS);
      setTimeout(() => {
        setContacts(loadedContacts);
        setInitialized(true);
      }, 0);
    }, []);
    ```
*   **Refactored State Initializers**:
    ```typescript
    const [contacts, setContacts] = useState<OutreachContact[]>(() => getItems<OutreachContact>(STORAGE_KEYS.OUTREACH_CONTACTS));
    ```
*   **Effect Disposition**: Keep partially (only set `initialized` on mount).
    ```typescript
    useEffect(() => {
      setInitialized(true);
    }, []);
    ```

---

### 11. [src/app/outreach/page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/outreach/page.tsx)
*   **Current code**:
    ```typescript
    useEffect(() => {
      const contacts = getItems<OutreachContact>(STORAGE_KEYS.OUTREACH_CONTACTS);
      const templates = getItems<EmailTemplate>(STORAGE_KEYS.EMAIL_TEMPLATES);
      const allCampaigns = getItems<Campaign>(STORAGE_KEYS.CAMPAIGNS);
      // ... (Computes nextMetrics and sortedCampaigns)
      setTimeout(() => {
        setMetrics(nextMetrics);
        setCampaigns(sortedCampaigns);
        setInitialized(true);
      }, 0);
    }, []);
    ```
*   **Refactored State Initializers**:
    ```typescript
    const [metrics, setMetrics] = useState<MetricData[]>(() => {
      const contacts = getItems<OutreachContact>(STORAGE_KEYS.OUTREACH_CONTACTS);
      const templates = getItems<EmailTemplate>(STORAGE_KEYS.EMAIL_TEMPLATES);
      const allCampaigns = getItems<Campaign>(STORAGE_KEYS.CAMPAIGNS);

      const activeCampaigns = allCampaigns.filter(
        (c) => c.status === 'sending' || c.status === 'scheduled'
      );
      const totalSent = allCampaigns.reduce((sum, c) => sum + c.stats.sent, 0);

      return [
        { label: 'Total Contacts', value: formatNumber(contacts.length), color: 'blue', icon: <ContactsIcon /> },
        { label: 'Templates', value: formatNumber(templates.length), color: 'emerald', icon: <TemplateIcon /> },
        { label: 'Active Campaigns', value: formatNumber(activeCampaigns.length), color: 'amber', icon: <CampaignIcon /> },
        { label: 'Emails Sent', value: formatNumber(totalSent), color: 'cyan', icon: <EmailIcon /> },
      ];
    });
    const [campaigns, setCampaigns] = useState<Campaign[]>(() => {
      const allCampaigns = getItems<Campaign>(STORAGE_KEYS.CAMPAIGNS);
      return allCampaigns.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    });
    ```
*   **Effect Disposition**: Keep partially (only set `initialized` on mount).
    ```typescript
    useEffect(() => {
      setInitialized(true);
    }, []);
    ```

---

### 12. [src/app/outreach/templates/page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/outreach/templates/page.tsx)
*   **Current code**:
    ```typescript
    useEffect(() => {
      // (Loads and seeds templates if empty)
      setTimeout(() => {
        setTemplates(stored);
        setInitialized(true);
      }, 0);
    }, []);
    ```
*   **Refactored State Initializers**:
    ```typescript
    const [templates, setTemplates] = useState<EmailTemplate[]>(() => {
      let stored = getItems<EmailTemplate>(STORAGE_KEYS.EMAIL_TEMPLATES);
      if (stored.length === 0) {
        const seeded = EMAIL_TEMPLATE_PRESETS.map((preset) => {
          const combinedText = `${preset.subject} ${preset.body}`;
          const variables = extractVariables(combinedText);
          return {
            id: generateId(),
            name: preset.name,
            category: preset.category,
            subject: preset.subject,
            body: preset.body,
            variables,
            createdAt: nowISO(),
            updatedAt: nowISO(),
          };
        });
        setItems(STORAGE_KEYS.EMAIL_TEMPLATES, seeded);
        stored = seeded;
      }
      return stored;
    });
    ```
*   **Effect Disposition**: Keep partially (only set `initialized` on mount).
    ```typescript
    useEffect(() => {
      setInitialized(true);
    }, []);
    ```

---

### 13. [src/app/outreach/tracking/page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/outreach/tracking/page.tsx)
*   **Current code**:
    ```typescript
    useEffect(() => {
      const stored = getItems<Campaign>(STORAGE_KEYS.CAMPAIGNS);
      // ...
      setTimeout(() => {
        setCampaigns(stored);
        if (firstCampId) setSelectedCampaignId(firstCampId);
        setInitialized(true);
      }, 0);
    }, []);
    ```
*   **Refactored State Initializers**:
    ```typescript
    const [campaigns, setCampaigns] = useState<Campaign[]>(() => getItems<Campaign>(STORAGE_KEYS.CAMPAIGNS));
    const [selectedCampaignId, setSelectedCampaignId] = useState<string>(() => {
      const stored = getItems<Campaign>(STORAGE_KEYS.CAMPAIGNS);
      return stored[0]?.id ?? '';
    });
    ```
*   **Effect Disposition**: Keep partially (only set `initialized` on mount).
    ```typescript
    useEffect(() => {
      setInitialized(true);
    }, []);
    ```

---

### 14. [src/app/page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/page.tsx)
*   **Current code**:
    ```typescript
    useEffect(() => {
      // (Seeds products, contacts, and tasks if empty)
      // ... (Calculates nextMetrics and urgentList)
      setTimeout(() => {
        setMetrics(nextMetrics);
        setUrgentTasks(urgentList);
        setInitialized(true);
      }, 0);
    }, []);
    ```
*   **Refactored State Initializers**:
    ```typescript
    const [metrics, setMetrics] = useState<MetricData[]>(() => {
      let products = getItems<Product>(STORAGE_KEYS.PRODUCTS);
      if (products.length === 0) {
        const samples = getSampleProducts();
        setItems(STORAGE_KEYS.PRODUCTS, samples);
        products = samples;
      }
      let contacts = getItems<Contact>(STORAGE_KEYS.CONTACTS);
      if (contacts.length === 0) {
        const samples = getSampleContacts();
        setItems(STORAGE_KEYS.CONTACTS, samples);
        contacts = samples;
      }
      let tasks = getItems<Task>(STORAGE_KEYS.TASKS);
      if (tasks.length === 0) {
        const defaults = getDefaultTasks();
        setItems(STORAGE_KEYS.TASKS, defaults);
        tasks = defaults;
      }
      const shipments = getItems<Shipment>(STORAGE_KEYS.SHIPMENTS);
      const invoices = getItems<Invoice>(STORAGE_KEYS.INVOICES);
      const campaigns = getItems<Campaign>(STORAGE_KEYS.CAMPAIGNS);

      const lowStock = products.filter(p => p.status === 'low-stock' || p.status === 'out-of-stock').length;
      const activeShipments = shipments.filter(s => s.status !== 'delivered').length;
      const pendingInvoices = invoices.filter(i => i.status === 'draft' || i.status === 'sent').length;
      const completedTasks = tasks.filter(t => t.status === 'done').length;
      const totalEmailsSent = campaigns.reduce((sum, c) => sum + c.stats.sent, 0);

      return [
        { label: 'Total Products', value: formatNumber(products.length), color: 'blue', icon: <MetricIcon name="products" /> },
        { label: 'Active Shipments', value: formatNumber(activeShipments), color: 'cyan', icon: <MetricIcon name="shipments" /> },
        { label: 'Pending Invoices', value: formatNumber(pendingInvoices), color: 'amber', icon: <MetricIcon name="invoices" /> },
        { label: 'Total Contacts', value: formatNumber(contacts.length), color: 'purple', icon: <MetricIcon name="contacts" /> },
        { label: 'Tasks Completed', value: `${String(completedTasks)}/${String(tasks.length)}`, color: 'emerald', icon: <MetricIcon name="tasks" /> },
        { label: 'Low Stock Alerts', value: formatNumber(lowStock), color: 'red', icon: <MetricIcon name="alert" /> },
        { label: 'Emails Sent', value: formatNumber(totalEmailsSent), color: 'blue', icon: <MetricIcon name="email" /> },
        { label: 'Revenue (Est.)', value: formatCurrency(0), color: 'emerald', icon: <MetricIcon name="revenue" /> },
      ];
    });

    const [urgentTasks, setUrgentTasks] = useState<Task[]>(() => {
      const tasks = getItems<Task>(STORAGE_KEYS.TASKS);
      return tasks.filter(t => t.priority === 'urgent' || t.priority === 'high').slice(0, 5);
    });
    ```
*   **Effect Disposition**: Keep partially (only set `initialized` on mount).
    ```typescript
    useEffect(() => {
      setInitialized(true);
    }, []);
    ```

---

### 15. [src/app/projects/page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/projects/page.tsx)
*   **Current code**:
    ```typescript
    useEffect(() => {
      // (Loads and seeds tasks if empty)
      setTimeout(() => {
        setTasks(stored);
        setInitialized(true);
      }, 0);
    }, []);
    ```
*   **Refactored State Initializers**:
    ```typescript
    const [tasks, setTasks] = useState<Task[]>(() => {
      let stored = getItems<Task>(STORAGE_KEYS.TASKS);
      if (stored.length === 0) {
        const defaults = getDefaultTasks();
        setItems(STORAGE_KEYS.TASKS, defaults);
        stored = defaults;
      }
      return stored;
    });
    ```
*   **Effect Disposition**: Keep partially (only set `initialized` on mount).
    ```typescript
    useEffect(() => {
      setInitialized(true);
    }, []);
    ```

---

## 4. tsconfig.json Scope Audit Report

The historical changes made to `tsconfig.json` are captured below:

### `git log --oneline -- tsconfig.json` output:
```
26f883d chore: configure strict ESLint baseline (next + ts-strict + a11y)
a86b502 feat: initial commit for TradeFlow import/export platform
```

### Confirmation of Flags:
The three strict flags added to `tsconfig.json` in commit `26f883d` are:
1. `"noUncheckedIndexedAccess": true`
2. `"exactOptionalPropertyTypes": true`
3. `"noImplicitOverride": true`

These flags match the strict typing baseline requirements requested in Prompt 1.

### Scope Creep Explanation:
The additions were originally made during Prompt 1's workspace modifications, but were left uncommitted in the working tree. During the Prompt 1.5 baseline configuration, a global `git add .` command staged all untracked and modified files, unintentionally including the `tsconfig.json` changes in commit `26f883d`.

---

## 5. Summary of Touch Scope ( टच स्कोप विवरण )
We estimate that **19 files** will be modified in total:

### Governance & Shared Specs (3 files)
- [AGENTS.md](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/AGENTS.md)
- [CLAUDE.md](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/CLAUDE.md)
- [.cursorrules](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/.cursorrules)

### Shared Core Libraries (1 file)
- [src/lib/storage.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/storage.ts)

### Hydrated UI Components & Pages (14 files - 1 shared page layout, 13 page components)
- [src/app/page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/page.tsx)
- [src/app/business-plan/page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/business-plan/page.tsx)
- [src/app/finance/page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/finance/page.tsx)
- [src/app/finance/projections/page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/finance/projections/page.tsx)
- [src/app/operations/compliance/page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/operations/compliance/page.tsx)
- [src/app/operations/contacts/page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/operations/contacts/page.tsx)
- [src/app/operations/inventory/page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/operations/inventory/page.tsx)
- [src/app/operations/invoices/page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/operations/invoices/page.tsx)
- [src/app/operations/shipments/page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/operations/shipments/page.tsx)
- [src/app/outreach/page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/outreach/page.tsx)
- [src/app/outreach/campaigns/page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/outreach/campaigns/page.tsx)
- [src/app/outreach/contacts/page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/outreach/contacts/page.tsx)
- [src/app/outreach/templates/page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/outreach/templates/page.tsx)
- [src/app/outreach/tracking/page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/outreach/tracking/page.tsx)
- [src/app/projects/page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/projects/page.tsx)

### Plans (1 file)
- [implementation_plan_p1_6.md](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/implementation_plan_p1_6.md)

---

## 6. Verification Plan

1. **Static Typecheck Gate**: `npx tsc --noEmit` must return zero errors.
2. **Linter Gate**: `npm run lint` must return zero errors and warnings.
3. **Production Build Gate**: `npm run build` must succeed compile.
