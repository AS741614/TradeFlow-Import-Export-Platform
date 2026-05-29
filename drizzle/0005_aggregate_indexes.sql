BEGIN;

CREATE INDEX IF NOT EXISTS "idx_invoices_status" ON "invoices" ("org_id", "status");
CREATE INDEX IF NOT EXISTS "idx_invoices_created_at" ON "invoices" ("org_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_invoices_currency" ON "invoices" ("org_id", "currency");

CREATE INDEX IF NOT EXISTS "idx_shipments_status" ON "shipments" ("org_id", "status");
CREATE INDEX IF NOT EXISTS "idx_shipments_created_at" ON "shipments" ("org_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_shipments_origin" ON "shipments" ("org_id", "origin");
CREATE INDEX IF NOT EXISTS "idx_shipments_destination" ON "shipments" ("org_id", "destination");

CREATE INDEX IF NOT EXISTS "idx_contacts_type" ON "contacts" ("org_id", "type");
CREATE INDEX IF NOT EXISTS "idx_contacts_status" ON "contacts" ("org_id", "status");
CREATE INDEX IF NOT EXISTS "idx_contacts_country" ON "contacts" ("org_id", "country");

COMMIT;
