CREATE TYPE "public"."campaign_schedule_type_enum" AS ENUM('immediate', 'scheduled', 'drip');--> statement-breakpoint
CREATE TYPE "public"."campaign_status_enum" AS ENUM('draft', 'scheduled', 'sending', 'paused', 'completed');--> statement-breakpoint
CREATE TYPE "public"."contact_status_enum" AS ENUM('active', 'prospect', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."contact_type_enum" AS ENUM('buyer', 'supplier', 'both');--> statement-breakpoint
CREATE TYPE "public"."cost_category_enum" AS ENUM('purchase', 'freight', 'insurance', 'customs', 'tax', 'logistics', 'warehousing', 'other');--> statement-breakpoint
CREATE TYPE "public"."email_status_enum" AS ENUM('pending', 'sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'failed');--> statement-breakpoint
CREATE TYPE "public"."invoice_status_enum" AS ENUM('draft', 'sent', 'paid', 'overdue');--> statement-breakpoint
CREATE TYPE "public"."outreach_source_enum" AS ENUM('csv', 'excel', 'json', 'manual');--> statement-breakpoint
CREATE TYPE "public"."product_status_enum" AS ENUM('in-stock', 'low-stock', 'out-of-stock');--> statement-breakpoint
CREATE TYPE "public"."shipment_doc_status_enum" AS ENUM('pending', 'submitted', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."shipment_doc_type_enum" AS ENUM('bill-of-lading', 'commercial-invoice', 'packing-list', 'certificate-of-origin', 'customs-declaration', 'insurance', 'other');--> statement-breakpoint
CREATE TYPE "public"."shipment_status_enum" AS ENUM('ordered', 'shipped', 'in-transit', 'customs', 'delivered');--> statement-breakpoint
CREATE TYPE "public"."swot_category_enum" AS ENUM('strength', 'weakness', 'opportunity', 'threat');--> statement-breakpoint
CREATE TYPE "public"."task_priority_enum" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."task_status_enum" AS ENUM('todo', 'in-progress', 'review', 'done');--> statement-breakpoint
CREATE TYPE "public"."template_category_enum" AS ENUM('introduction', 'catalog', 'quotation', 'follow-up', 're-engagement', 'notification', 'custom');--> statement-breakpoint
CREATE TYPE "public"."user_role_enum" AS ENUM('owner', 'admin', 'member');--> statement-breakpoint
CREATE TABLE "deletion_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"table_name" varchar(100) NOT NULL,
	"record_id" uuid NOT NULL,
	"deleted_data" jsonb NOT NULL,
	"deleted_by_user_id" uuid NOT NULL,
	"deleted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reason" text
);
--> statement-breakpoint
CREATE TABLE "orgs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"country" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"org_id" uuid NOT NULL,
	"role" "user_role_enum" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "compliance_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"created_by_user_id" uuid,
	"shipment_id" uuid,
	"document_name" varchar(255) NOT NULL,
	"document_type" varchar(100) NOT NULL,
	"status" "shipment_doc_status_enum" NOT NULL,
	"required_by" date NOT NULL,
	"submitted_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"created_by_user_id" uuid,
	"company" varchar(255) NOT NULL,
	"contact_person" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(50) NOT NULL,
	"country" varchar(100) NOT NULL,
	"address" text,
	"type" "contact_type_enum" NOT NULL,
	"status" "contact_status_enum" NOT NULL,
	"trade_terms" varchar(255),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"description" varchar(255) NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" integer NOT NULL,
	"total" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"created_by_user_id" uuid,
	"number" varchar(100) NOT NULL,
	"contact_id" uuid NOT NULL,
	"shipment_id" uuid,
	"currency" varchar(3) NOT NULL,
	"subtotal" integer NOT NULL,
	"tax_rate" integer NOT NULL,
	"tax" integer NOT NULL,
	"total" integer NOT NULL,
	"status" "invoice_status_enum" NOT NULL,
	"issued_date" date NOT NULL,
	"due_date" date NOT NULL,
	"paid_date" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"created_by_user_id" uuid,
	"name" varchar(255) NOT NULL,
	"sku" varchar(100) NOT NULL,
	"hs_code" varchar(50) NOT NULL,
	"category" varchar(100) NOT NULL,
	"quantity" integer NOT NULL,
	"reorder_level" integer NOT NULL,
	"unit_cost" integer NOT NULL,
	"currency" varchar(3) NOT NULL,
	"supplier" varchar(255) NOT NULL,
	"origin" varchar(100) NOT NULL,
	"status" "product_status_enum" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipment_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "shipment_doc_type_enum" NOT NULL,
	"status" "shipment_doc_status_enum" NOT NULL,
	"uploaded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "shipment_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"created_by_user_id" uuid,
	"reference" varchar(100) NOT NULL,
	"origin" varchar(100) NOT NULL,
	"destination" varchar(100) NOT NULL,
	"carrier" varchar(100) NOT NULL,
	"status" "shipment_status_enum" NOT NULL,
	"estimated_arrival" date NOT NULL,
	"actual_arrival" date,
	"tracking_number" varchar(100),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cost_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"created_by_user_id" uuid,
	"category" "cost_category_enum" NOT NULL,
	"description" varchar(255) NOT NULL,
	"amount" integer NOT NULL,
	"currency" varchar(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_projections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"created_by_user_id" uuid,
	"month" varchar(20) NOT NULL,
	"revenue" integer NOT NULL,
	"expenses" integer NOT NULL,
	"profit" integer NOT NULL,
	"currency" varchar(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"status" "email_status_enum" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"created_by_user_id" uuid,
	"name" varchar(255) NOT NULL,
	"template_id" uuid NOT NULL,
	"status" "campaign_status_enum" NOT NULL,
	"schedule_type" "campaign_schedule_type_enum" NOT NULL,
	"scheduled_at" timestamp with time zone,
	"sends_per_hour" integer,
	"subject_line_a" text NOT NULL,
	"subject_line_b" text,
	"stats" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"created_by_user_id" uuid,
	"name" varchar(255) NOT NULL,
	"category" "template_category_enum" NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"variables" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outreach_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"created_by_user_id" uuid,
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"company" varchar(255) NOT NULL,
	"phone" varchar(50),
	"country" varchar(100) NOT NULL,
	"tags" jsonb NOT NULL,
	"source" "outreach_source_enum" NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_contacted" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "business_plan_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"created_by_user_id" uuid,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "swot_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"created_by_user_id" uuid,
	"text" text NOT NULL,
	"category" "swot_category_enum" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"created_by_user_id" uuid,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"status" "task_status_enum" NOT NULL,
	"priority" "task_priority_enum" NOT NULL,
	"due_date" date,
	"assignee" varchar(255),
	"tags" jsonb NOT NULL,
	"category" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deletion_logs" ADD CONSTRAINT "deletion_logs_deleted_by_user_id_users_id_fk" FOREIGN KEY ("deleted_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_items" ADD CONSTRAINT "compliance_items_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_items" ADD CONSTRAINT "compliance_items_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_items" ADD CONSTRAINT "compliance_items_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_documents" ADD CONSTRAINT "shipment_documents_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_products" ADD CONSTRAINT "shipment_products_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_products" ADD CONSTRAINT "shipment_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_items" ADD CONSTRAINT "cost_items_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_items" ADD CONSTRAINT "cost_items_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_projections" ADD CONSTRAINT "financial_projections_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_projections" ADD CONSTRAINT "financial_projections_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_contacts" ADD CONSTRAINT "campaign_contacts_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_contacts" ADD CONSTRAINT "campaign_contacts_contact_id_outreach_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."outreach_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_template_id_email_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."email_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_contacts" ADD CONSTRAINT "outreach_contacts_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_contacts" ADD CONSTRAINT "outreach_contacts_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_plan_sections" ADD CONSTRAINT "business_plan_sections_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_plan_sections" ADD CONSTRAINT "business_plan_sections_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swot_items" ADD CONSTRAINT "swot_items_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swot_items" ADD CONSTRAINT "swot_items_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_deletion_logs_deleted_by_user_id" ON "deletion_logs" USING btree ("deleted_by_user_id");--> statement-breakpoint
CREATE INDEX "idx_users_org_id" ON "users" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_compliance_items_org_id" ON "compliance_items" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_compliance_items_created_by_user_id" ON "compliance_items" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "idx_compliance_items_shipment_id" ON "compliance_items" USING btree ("shipment_id");--> statement-breakpoint
CREATE INDEX "idx_contacts_org_id" ON "contacts" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_contacts_created_by_user_id" ON "contacts" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "idx_invoice_line_items_invoice_id" ON "invoice_line_items" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "idx_invoices_org_id" ON "invoices" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_invoices_created_by_user_id" ON "invoices" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "idx_invoices_contact_id" ON "invoices" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "idx_invoices_shipment_id" ON "invoices" USING btree ("shipment_id");--> statement-breakpoint
CREATE INDEX "idx_products_org_id" ON "products" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_products_created_by_user_id" ON "products" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "idx_shipment_documents_shipment_id" ON "shipment_documents" USING btree ("shipment_id");--> statement-breakpoint
CREATE INDEX "idx_shipment_products_shipment_id" ON "shipment_products" USING btree ("shipment_id");--> statement-breakpoint
CREATE INDEX "idx_shipment_products_product_id" ON "shipment_products" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_shipments_org_id" ON "shipments" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_shipments_created_by_user_id" ON "shipments" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "idx_cost_items_org_id" ON "cost_items" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_cost_items_created_by_user_id" ON "cost_items" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "idx_financial_projections_org_id" ON "financial_projections" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_financial_projections_created_by_user_id" ON "financial_projections" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "idx_campaign_contacts_campaign_id" ON "campaign_contacts" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "idx_campaign_contacts_contact_id" ON "campaign_contacts" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "idx_campaigns_org_id" ON "campaigns" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_campaigns_created_by_user_id" ON "campaigns" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "idx_campaigns_template_id" ON "campaigns" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "idx_email_templates_org_id" ON "email_templates" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_email_templates_created_by_user_id" ON "email_templates" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "idx_outreach_contacts_org_id" ON "outreach_contacts" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_outreach_contacts_created_by_user_id" ON "outreach_contacts" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "idx_business_plan_sections_org_id" ON "business_plan_sections" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_business_plan_sections_created_by_user_id" ON "business_plan_sections" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "idx_swot_items_org_id" ON "swot_items" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_swot_items_created_by_user_id" ON "swot_items" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_org_id" ON "tasks" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_created_by_user_id" ON "tasks" USING btree ("created_by_user_id");