// ============================================================
// TradeFlow — Core Type Definitions
// ============================================================

// ---- Operations: Inventory ----

export interface Product {
  id: string;
  name: string;
  sku: string;
  hsCode: string;
  category: string;
  quantity: number;
  reorderLevel: number;
  unitCost: number;
  currency: string;
  supplier: string;
  origin: string;
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
  createdAt: string;
  updatedAt: string;
}

// ---- Operations: Shipments ----

export type ShipmentStatus = 'ordered' | 'shipped' | 'in-transit' | 'customs' | 'delivered';

export interface ShipmentProduct {
  productId: string;
  productName: string;
  quantity: number;
}

export interface ShipmentDocument {
  id: string;
  name: string;
  type: 'bill-of-lading' | 'commercial-invoice' | 'packing-list' | 'certificate-of-origin' | 'customs-declaration' | 'insurance' | 'other';
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
  uploadedAt?: string | undefined;
}

export interface Shipment {
  id: string;
  reference: string;
  products: ShipmentProduct[];
  origin: string;
  destination: string;
  carrier: string;
  status: ShipmentStatus;
  estimatedArrival: string;
  actualArrival?: string | undefined;
  trackingNumber?: string | undefined;
  documents: ShipmentDocument[];
  notes?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

// ---- Operations: Invoices ----

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  number: string;
  contactId: string;
  contactName: string;
  shipmentId?: string | undefined;
  lineItems: LineItem[];
  currency: string;
  subtotal: number;
  taxRate: number;
  tax: number;
  total: number;
  status: InvoiceStatus;
  issuedDate: string;
  dueDate: string;
  paidDate?: string | undefined;
  notes?: string | undefined;
  createdAt: string;
}

// ---- Operations: Contacts ----

export type ContactType = 'buyer' | 'supplier' | 'both';
export type ContactStatus = 'active' | 'prospect' | 'inactive';

export interface Contact {
  id: string;
  company: string;
  contactPerson: string;
  email: string;
  phone: string;
  country: string;
  address?: string | undefined;
  type: ContactType;
  status: ContactStatus;
  tradeTerms?: string | undefined;
  notes?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

// ---- Operations: Compliance ----

export interface ComplianceItem {
  id: string;
  shipmentId?: string | undefined;
  documentName: string;
  documentType: string;
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
  requiredBy: string;
  submittedAt?: string | undefined;
  approvedAt?: string | undefined;
  notes?: string | undefined;
}

// ---- Business Plan ----

export interface SwotItem {
  id: string;
  text: string;
  category: 'strength' | 'weakness' | 'opportunity' | 'threat';
}

export interface BusinessPlanSection {
  id: string;
  title: string;
  content: string;
  order: number;
}

// ---- Project Dashboard ----

export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | undefined;
  assignee?: string | undefined;
  tags: string[];
  category: string;
  createdAt: string;
  updatedAt: string;
}

// ---- Financial Planner ----

export interface CostItem {
  id: string;
  category: 'purchase' | 'freight' | 'insurance' | 'customs' | 'tax' | 'logistics' | 'warehousing' | 'other';
  description: string;
  amount: number;
  currency: string;
}

export interface FinancialProjection {
  id: string;
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
  currency: string;
}

// ---- Email Outreach ----

export type EmailStatus = 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'replied' | 'bounced' | 'failed';
export type OutreachSource = 'csv' | 'excel' | 'json' | 'manual';
export type TemplateCategory = 'introduction' | 'catalog' | 'quotation' | 'follow-up' | 're-engagement' | 'notification' | 'custom';
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'paused' | 'completed';

export interface OutreachContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  phone?: string | undefined;
  country: string;
  tags: string[];
  source: OutreachSource;
  importedAt: string;
  lastContacted?: string | undefined;
  campaignHistory: { campaignId: string; status: EmailStatus }[];
}

export interface EmailTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  subject: string;
  body: string;
  variables: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CampaignSchedule {
  type: 'immediate' | 'scheduled' | 'drip';
  scheduledAt?: string | undefined;
  sendsPerHour?: number | undefined;
}

export interface CampaignStats {
  total: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  replied: number;
  bounced: number;
  failed: number;
}

export interface Campaign {
  id: string;
  name: string;
  templateId: string;
  contactIds: string[];
  status: CampaignStatus;
  schedule: CampaignSchedule;
  subjectLineA: string;
  subjectLineB?: string | undefined;
  stats: CampaignStats;
  createdAt: string;
  updatedAt: string;
}

// ---- Dashboard Overview ----

export interface DashboardMetrics {
  totalProducts: number;
  lowStockProducts: number;
  activeShipments: number;
  pendingInvoices: number;
  totalContacts: number;
  totalTasks: number;
  completedTasks: number;
  totalCampaigns: number;
  emailsSent: number;
  revenue: number;
}

// ---- Navigation ----

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  children?: NavItem[] | undefined;
}
