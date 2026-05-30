// ============================================================
// TradeFlow — Constants & Seed Data
// ============================================================

import type { NavItem, Task, SwotItem, BusinessPlanSection, Product, Contact } from './types';
import { generateId, nowISO } from './utils';

// ---- Navigation Structure ----

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: 'dashboard' },
  {
    label: 'Operations',
    href: '/operations',
    icon: 'operations',
    children: [
      { label: 'Inventory', href: '/operations/inventory', icon: 'inventory' },
      { label: 'Shipments', href: '/operations/shipments', icon: 'shipments' },
      { label: 'Invoices', href: '/operations/invoices', icon: 'invoices' },
      { label: 'Contacts', href: '/operations/contacts', icon: 'contacts' },
      { label: 'Compliance', href: '/operations/compliance', icon: 'compliance' },
    ],
  },
  { label: 'Business Plan', href: '/business-plan', icon: 'plan' },
  { label: 'Projects', href: '/projects', icon: 'projects' },
  {
    label: 'Finance',
    href: '/finance',
    icon: 'finance',
    children: [
      { label: 'Overview', href: '/finance', icon: 'finance' },
      { label: 'Margins', href: '/finance/margins', icon: 'margins' },
      { label: 'Currency', href: '/finance/currency', icon: 'currency' },
      { label: 'Projections', href: '/finance/projections', icon: 'projections' },
    ],
  },
  {
    label: 'Outreach',
    href: '/outreach',
    icon: 'outreach',
    children: [
      { label: 'Dashboard', href: '/outreach', icon: 'outreach' },
      { label: 'Contacts', href: '/outreach/contacts', icon: 'contacts' },
      { label: 'Templates', href: '/outreach/templates', icon: 'templates' },
      { label: 'Campaigns', href: '/outreach/campaigns', icon: 'campaigns' },
      { label: 'Tracking', href: '/outreach/tracking', icon: 'tracking' },
    ],
  },
  { label: 'Activity Log', href: '/activity-log', icon: 'activity' },
];

// ---- Product Categories ----

export const PRODUCT_CATEGORIES: readonly string[] = [
  'Electronics',
  'Textiles & Apparel',
  'Food & Beverages',
  'Raw Materials',
  'Machinery',
  'Chemicals',
  'Automotive Parts',
  'Furniture',
  'Medical Supplies',
  'Consumer Goods',
  'Agricultural Products',
  'Other',
] as const;

if (PRODUCT_CATEGORIES.length === 0) {
  throw new Error('PRODUCT_CATEGORIES list must not be empty');
}
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const DEFAULT_PRODUCT_CATEGORY: string = PRODUCT_CATEGORIES[0]!;
// Reason for non-null assertion: guarded by length check above

// ---- Countries (common trade partners) ----

export const COUNTRIES: readonly string[] = [
  'United States', 'China', 'India', 'United Kingdom', 'Germany',
  'Japan', 'South Korea', 'Brazil', 'Canada', 'Australia',
  'France', 'Italy', 'Netherlands', 'Singapore', 'UAE',
  'Turkey', 'Mexico', 'Indonesia', 'Thailand', 'Vietnam',
  'Malaysia', 'Philippines', 'Bangladesh', 'Pakistan', 'South Africa',
  'Saudi Arabia', 'Egypt', 'Nigeria', 'Kenya', 'Sri Lanka',
] as const;

if (COUNTRIES.length < 2) {
  throw new Error('COUNTRIES list must contain at least 2 entries');
}
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const DEFAULT_COUNTRY: string = COUNTRIES[0]!;
// Reason for non-null assertion: guarded by length check above

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const DEFAULT_DESTINATION_COUNTRY: string = COUNTRIES[1]!;
// Reason for non-null assertion: guarded by length check above

// ---- Currencies ----

export const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
];

// ---- Trade Terms (Incoterms 2020) ----

export const INCOTERMS: readonly string[] = [
  'EXW - Ex Works',
  'FCA - Free Carrier',
  'CPT - Carriage Paid To',
  'CIP - Carriage & Insurance Paid To',
  'DAP - Delivered at Place',
  'DPU - Delivered at Place Unloaded',
  'DDP - Delivered Duty Paid',
  'FAS - Free Alongside Ship',
  'FOB - Free on Board',
  'CFR - Cost & Freight',
  'CIF - Cost, Insurance & Freight',
] as const;

if (INCOTERMS.length === 0) {
  throw new Error('INCOTERMS list must not be empty');
}
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const DEFAULT_INCOTERM: string = INCOTERMS[0]!;
// Reason for non-null assertion: guarded by length check above

// ---- Carriers ----

export const CARRIERS: readonly string[] = [
  'Maersk', 'MSC', 'CMA CGM', 'Hapag-Lloyd', 'COSCO',
  'Evergreen', 'ONE', 'Yang Ming', 'ZIM', 'HMM',
  'DHL Freight', 'FedEx Logistics', 'UPS Supply Chain',
  'DB Schenker', 'Kuehne+Nagel', 'Other',
] as const;

if (CARRIERS.length === 0) {
  throw new Error('CARRIERS list must not be empty');
}
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const DEFAULT_CARRIER: string = CARRIERS[0]!;
// Reason for non-null assertion: guarded by length check above

// ---- Seed Data: Default Tasks for New Business ----

export function getDefaultTasks(): Task[] {
  const now = nowISO();
  return [
    { id: generateId(), title: 'Register Business Entity', description: 'Register company with local authorities, obtain business license', status: 'todo', priority: 'urgent', tags: ['legal', 'setup'], category: 'Company Setup', createdAt: now, updatedAt: now },
    { id: generateId(), title: 'Open Business Bank Account', description: 'Open dedicated bank account with international wire capability', status: 'todo', priority: 'high', tags: ['finance', 'setup'], category: 'Company Setup', createdAt: now, updatedAt: now },
    { id: generateId(), title: 'Obtain Import/Export License', description: 'Apply for IEC or equivalent import-export code', status: 'todo', priority: 'urgent', tags: ['legal', 'compliance'], category: 'Compliance', createdAt: now, updatedAt: now },
    { id: generateId(), title: 'Research Target Markets', description: 'Identify top 3 export markets with demand analysis', status: 'todo', priority: 'high', tags: ['research', 'strategy'], category: 'Strategy', createdAt: now, updatedAt: now },
    { id: generateId(), title: 'Source Initial Suppliers', description: 'Find and vet at least 5 potential suppliers', status: 'todo', priority: 'high', tags: ['sourcing', 'operations'], category: 'Operations', createdAt: now, updatedAt: now },
    { id: generateId(), title: 'Set Up Logistics Partners', description: 'Negotiate rates with freight forwarders and carriers', status: 'todo', priority: 'medium', tags: ['logistics', 'operations'], category: 'Operations', createdAt: now, updatedAt: now },
    { id: generateId(), title: 'Create Product Catalog', description: 'Build product catalog with pricing and specifications', status: 'todo', priority: 'medium', tags: ['marketing', 'sales'], category: 'Marketing', createdAt: now, updatedAt: now },
    { id: generateId(), title: 'Build Company Website', description: 'Create professional website showcasing products', status: 'todo', priority: 'medium', tags: ['marketing', 'digital'], category: 'Marketing', createdAt: now, updatedAt: now },
    { id: generateId(), title: 'First Buyer Outreach Campaign', description: 'Launch email outreach to 50+ potential buyers', status: 'todo', priority: 'high', tags: ['sales', 'outreach'], category: 'Sales', createdAt: now, updatedAt: now },
    { id: generateId(), title: 'Arrange First Shipment', description: 'Complete first trial shipment from supplier to buyer', status: 'todo', priority: 'medium', tags: ['operations', 'milestone'], category: 'Operations', createdAt: now, updatedAt: now },
    { id: generateId(), title: 'Set Up Insurance', description: 'Obtain cargo insurance and liability coverage', status: 'todo', priority: 'medium', tags: ['compliance', 'finance'], category: 'Compliance', createdAt: now, updatedAt: now },
    { id: generateId(), title: 'Join Trade Associations', description: 'Register with relevant trade bodies and export councils', status: 'todo', priority: 'low', tags: ['networking', 'strategy'], category: 'Strategy', createdAt: now, updatedAt: now },
  ];
}

// ---- Seed Data: Default SWOT Items ----

export function getDefaultSwotItems(): SwotItem[] {
  return [
    { id: generateId(), text: 'Direct supplier relationships reducing middleman costs', category: 'strength' },
    { id: generateId(), text: 'Technology-driven operations (TradeFlow platform)', category: 'strength' },
    { id: generateId(), text: 'Lean team with low overhead costs', category: 'strength' },
    { id: generateId(), text: 'Limited brand recognition in target markets', category: 'weakness' },
    { id: generateId(), text: 'No existing buyer relationships or track record', category: 'weakness' },
    { id: generateId(), text: 'Cash flow constraints with payment terms', category: 'weakness' },
    { id: generateId(), text: 'Growing global e-commerce and B2B marketplace adoption', category: 'opportunity' },
    { id: generateId(), text: 'Government trade incentives and free trade agreements', category: 'opportunity' },
    { id: generateId(), text: 'Untapped demand in emerging markets', category: 'opportunity' },
    { id: generateId(), text: 'Currency volatility and exchange rate risk', category: 'threat' },
    { id: generateId(), text: 'Trade policy changes and tariff barriers', category: 'threat' },
    { id: generateId(), text: 'Established competitors with deeper supply chains', category: 'threat' },
  ];
}

// ---- Seed Data: Default Business Plan ----

export function getDefaultBusinessPlan(): BusinessPlanSection[] {
  return [
    { id: generateId(), title: 'Executive Summary', content: 'Our import/export company connects global suppliers with buyers, leveraging technology to streamline operations, reduce costs, and deliver value across borders. We focus on quality products, reliable logistics, and transparent pricing.', sortOrder: 1 },
    { id: generateId(), title: 'Market Analysis', content: 'The global trade market exceeds $25 trillion annually. Key growth sectors include electronics, textiles, and agricultural products. Digital B2B platforms are transforming how businesses discover partners and transact internationally.', sortOrder: 2 },
    { id: generateId(), title: 'Operations Plan', content: 'We operate a lean model: sourcing products from verified suppliers, partnering with global freight forwarders, and maintaining quality through inspection protocols. All operations are managed through our TradeFlow platform.', sortOrder: 3 },
    { id: generateId(), title: 'Go-to-Market Strategy', content: 'Phase 1: Direct outreach to target buyers via email campaigns and trade shows. Phase 2: Online presence through B2B marketplaces (Alibaba, TradeIndia, Global Sources). Phase 3: Build direct buyer relationships and repeat orders.', sortOrder: 4 },
    { id: generateId(), title: 'Risk Assessment', content: 'Key risks include currency fluctuations, supply chain disruptions, regulatory changes, and payment defaults. Mitigation strategies include hedging, diversified supplier base, compliance monitoring, and trade credit insurance.', sortOrder: 5 },
  ];
}

// ---- Seed Data: Sample Products ----

export function getSampleProducts(): Product[] {
  const now = nowISO();
  return [
    { id: generateId(), name: 'Organic Cotton Fabric', sku: 'TEX-001', hsCode: '5208.12', category: 'Textiles & Apparel', quantity: 5000, reorderLevel: 1000, unitCost: 450, currency: 'USD', supplier: 'Mumbai Textiles Co.', origin: 'India', status: 'in-stock', createdAt: now, updatedAt: now },
    { id: generateId(), name: 'Stainless Steel Bolts M8', sku: 'MET-015', hsCode: '7318.15', category: 'Raw Materials', quantity: 250, reorderLevel: 500, unitCost: 85, currency: 'USD', supplier: 'Shanghai Steel Works', origin: 'China', status: 'low-stock', createdAt: now, updatedAt: now },
    { id: generateId(), name: 'Arabica Coffee Beans', sku: 'FNB-003', hsCode: '0901.11', category: 'Food & Beverages', quantity: 0, reorderLevel: 200, unitCost: 1200, currency: 'USD', supplier: 'Colombian Coffee Exports', origin: 'Brazil', status: 'out-of-stock', createdAt: now, updatedAt: now },
    { id: generateId(), name: 'LED Panel Light 60W', sku: 'ELC-042', hsCode: '9405.42', category: 'Electronics', quantity: 3200, reorderLevel: 500, unitCost: 1875, currency: 'USD', supplier: 'Shenzhen Bright Co.', origin: 'China', status: 'in-stock', createdAt: now, updatedAt: now },
    { id: generateId(), name: 'Bamboo Cutting Board Set', sku: 'HOM-008', hsCode: '4419.12', category: 'Consumer Goods', quantity: 1800, reorderLevel: 400, unitCost: 620, currency: 'USD', supplier: 'Vietnam Bamboo Ltd.', origin: 'Vietnam', status: 'in-stock', createdAt: now, updatedAt: now },
  ];
}

// ---- Seed Data: Sample Contacts ----

export function getSampleContacts(): Contact[] {
  const now = nowISO();
  return [
    { id: generateId(), company: 'Mumbai Textiles Co.', contactPerson: 'Rajesh Kumar', email: 'rajesh@mumbaitextiles.com', phone: '+91-22-4567890', country: 'India', type: 'supplier', status: 'active', tradeTerms: 'FOB - Free on Board', createdAt: now, updatedAt: now },
    { id: generateId(), company: 'EuroTrade GmbH', contactPerson: 'Hans Mueller', email: 'h.mueller@eurotrade.de', phone: '+49-30-1234567', country: 'Germany', type: 'buyer', status: 'active', tradeTerms: 'CIF - Cost, Insurance & Freight', createdAt: now, updatedAt: now },
    { id: generateId(), company: 'Shanghai Steel Works', contactPerson: 'Wei Zhang', email: 'wei@shanghaisteelworks.cn', phone: '+86-21-8765432', country: 'China', type: 'supplier', status: 'active', tradeTerms: 'EXW - Ex Works', createdAt: now, updatedAt: now },
    { id: generateId(), company: 'Pacific Imports LLC', contactPerson: 'Sarah Johnson', email: 'sarah@pacificimports.com', phone: '+1-310-555-0123', country: 'United States', type: 'buyer', status: 'prospect', tradeTerms: 'DDP - Delivered Duty Paid', createdAt: now, updatedAt: now },
    { id: generateId(), company: 'Gulf Trading Est.', contactPerson: 'Ahmed Al-Rashid', email: 'ahmed@gulftrading.ae', phone: '+971-4-3456789', country: 'UAE', type: 'buyer', status: 'prospect', tradeTerms: 'CFR - Cost & Freight', createdAt: now, updatedAt: now },
  ];
}

// ---- Email Template Presets ----

export const EMAIL_TEMPLATE_PRESETS = [
  {
    name: 'Introduction / Cold Outreach',
    category: 'introduction' as const,
    subject: 'Partnership Opportunity — Quality {{product_category}} from {{origin_country}}',
    body: `<p>Dear {{first_name}},</p>
<p>I hope this message finds you well. My name is {{sender_name}} from {{company_name}}, and we specialize in sourcing and exporting high-quality {{product_category}}.</p>
<p>We noticed that {{their_company}} operates in {{their_country}} and may benefit from our competitive pricing and reliable supply chain. We'd love to explore a potential partnership.</p>
<p><strong>What we offer:</strong></p>
<ul>
<li>Direct factory pricing</li>
<li>Quality inspection before shipment</li>
<li>Flexible payment and trade terms</li>
<li>Reliable logistics and on-time delivery</li>
</ul>
<p>Would you be available for a brief call this week to discuss further?</p>
<p>Best regards,<br/>{{sender_name}}<br/>{{company_name}}</p>`,
  },
  {
    name: 'Product Catalog Sharing',
    category: 'catalog' as const,
    subject: 'Our Latest Product Catalog — {{company_name}}',
    body: `<p>Dear {{first_name}},</p>
<p>Thank you for your interest in {{company_name}}. Please find attached our latest product catalog featuring our full range of {{product_category}}.</p>
<p>Highlights include:</p>
<ul>
<li>Competitive FOB/CIF pricing</li>
<li>MOQ starting from {{min_order}}</li>
<li>Custom packaging and branding available</li>
</ul>
<p>Please let us know if any items catch your interest, and we'll be happy to provide detailed quotations.</p>
<p>Best regards,<br/>{{sender_name}}</p>`,
  },
  {
    name: 'Price Quotation Follow-up',
    category: 'quotation' as const,
    subject: 'Following Up on Our Quotation — {{company_name}}',
    body: `<p>Dear {{first_name}},</p>
<p>I wanted to follow up on the quotation we sent on {{quote_date}} for {{product_name}}. We hope it meets your requirements.</p>
<p>Please note that these prices are valid until {{validity_date}}. We're flexible on quantities and can accommodate special requests.</p>
<p>Would you like to proceed with a sample order, or do you have any questions about the specifications?</p>
<p>Looking forward to hearing from you.</p>
<p>Best regards,<br/>{{sender_name}}<br/>{{company_name}}</p>`,
  },
  {
    name: 'Re-engagement',
    category: 're-engagement' as const,
    subject: 'It\'s Been a While — New Offerings from {{company_name}}',
    body: `<p>Dear {{first_name}},</p>
<p>It's been some time since we last connected, and I wanted to reach out with some exciting updates from {{company_name}}.</p>
<p>We've expanded our product line and improved our pricing structure. I believe there may be new opportunities for us to collaborate.</p>
<p>Would you be interested in receiving our updated catalog or scheduling a quick call?</p>
<p>Best regards,<br/>{{sender_name}}</p>`,
  },
  {
    name: 'Shipment Notification',
    category: 'notification' as const,
    subject: 'Shipment Dispatched — Order #{{order_number}}',
    body: `<p>Dear {{first_name}},</p>
<p>We're pleased to inform you that your order #{{order_number}} has been dispatched.</p>
<p><strong>Shipment Details:</strong></p>
<ul>
<li><strong>Carrier:</strong> {{carrier}}</li>
<li><strong>Tracking Number:</strong> {{tracking_number}}</li>
<li><strong>Estimated Arrival:</strong> {{estimated_arrival}}</li>
</ul>
<p>You can track your shipment using the tracking number above. Please don't hesitate to contact us if you have any questions.</p>
<p>Best regards,<br/>{{sender_name}}<br/>{{company_name}}</p>`,
  },
];
