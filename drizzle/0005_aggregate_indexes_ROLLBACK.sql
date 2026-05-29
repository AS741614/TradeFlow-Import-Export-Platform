BEGIN;

DROP INDEX IF EXISTS "idx_invoices_status";
DROP INDEX IF EXISTS "idx_invoices_created_at";
DROP INDEX IF EXISTS "idx_invoices_currency";

DROP INDEX IF EXISTS "idx_shipments_status";
DROP INDEX IF EXISTS "idx_shipments_created_at";
DROP INDEX IF EXISTS "idx_shipments_origin";
DROP INDEX IF EXISTS "idx_shipments_destination";

DROP INDEX IF EXISTS "idx_contacts_type";
DROP INDEX IF EXISTS "idx_contacts_status";
DROP INDEX IF EXISTS "idx_contacts_country";

COMMIT;
