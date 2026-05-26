import { pgEnum } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role_enum', ['owner', 'admin', 'member']);
export const productStatusEnum = pgEnum('product_status_enum', ['in-stock', 'low-stock', 'out-of-stock']);
export const shipmentStatusEnum = pgEnum('shipment_status_enum', ['ordered', 'shipped', 'in-transit', 'customs', 'delivered']);
export const shipmentDocTypeEnum = pgEnum('shipment_doc_type_enum', ['bill-of-lading', 'commercial-invoice', 'packing-list', 'certificate-of-origin', 'customs-declaration', 'insurance', 'other']);
export const shipmentDocStatusEnum = pgEnum('shipment_doc_status_enum', ['pending', 'submitted', 'approved', 'rejected']);
export const invoiceStatusEnum = pgEnum('invoice_status_enum', ['draft', 'sent', 'paid', 'overdue']);
export const contactTypeEnum = pgEnum('contact_type_enum', ['buyer', 'supplier', 'both']);
export const contactStatusEnum = pgEnum('contact_status_enum', ['active', 'prospect', 'inactive']);
export const swotCategoryEnum = pgEnum('swot_category_enum', ['strength', 'weakness', 'opportunity', 'threat']);
export const taskStatusEnum = pgEnum('task_status_enum', ['todo', 'in-progress', 'review', 'done']);
export const taskPriorityEnum = pgEnum('task_priority_enum', ['low', 'medium', 'high', 'urgent']);
export const costCategoryEnum = pgEnum('cost_category_enum', ['purchase', 'freight', 'insurance', 'customs', 'tax', 'logistics', 'warehousing', 'other']);
export const emailStatusEnum = pgEnum('email_status_enum', ['pending', 'sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'failed']);
export const outreachSourceEnum = pgEnum('outreach_source_enum', ['csv', 'excel', 'json', 'manual']);
export const templateCategoryEnum = pgEnum('template_category_enum', ['introduction', 'catalog', 'quotation', 'follow-up', 're-engagement', 'notification', 'custom']);
export const campaignStatusEnum = pgEnum('campaign_status_enum', ['draft', 'scheduled', 'sending', 'paused', 'completed']);
export const campaignScheduleTypeEnum = pgEnum('campaign_schedule_type_enum', ['immediate', 'scheduled', 'drip']);
