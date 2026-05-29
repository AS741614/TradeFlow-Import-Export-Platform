BEGIN;

-- Fail loudly if any rows can't get an org_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "deletion_logs" WHERE "deleted_by_user_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot migrate: % rows have NULL user_id', 
      (SELECT COUNT(*) FROM "deletion_logs" WHERE "deleted_by_user_id" IS NULL);
  END IF;
END $$;

-- Fail loudly if any table_name values won't be handled by CASE
DO $$
DECLARE
  unhandled_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unhandled_count FROM "deletion_logs"
  WHERE "table_name" NOT IN (
    'contacts', 'products', 'shipments', 'invoices', 'compliance_items',
    'cost_items', 'financial_projections', 'outreach_contacts',
    'email_templates', 'campaigns', 'business_plan_sections', 
    'swot_items', 'tasks'
  );
  IF unhandled_count > 0 THEN
    RAISE EXCEPTION 'Cannot migrate: % rows have unhandled table_name', 
      unhandled_count;
  END IF;
END $$;

ALTER TABLE "deletion_logs" RENAME TO "activity_log";

ALTER TABLE "activity_log" RENAME COLUMN "table_name" TO "entity_type";
ALTER TABLE "activity_log" RENAME COLUMN "record_id" TO "entity_id";
ALTER TABLE "activity_log" RENAME COLUMN "deleted_by_user_id" TO "user_id";
ALTER TABLE "activity_log" RENAME COLUMN "deleted_data" TO "change_summary";
ALTER TABLE "activity_log" RENAME COLUMN "deleted_at" TO "created_at";

ALTER TABLE "activity_log" ADD COLUMN "org_id" uuid;
ALTER TABLE "activity_log" ADD COLUMN "action" text;
ALTER TABLE "activity_log" ADD COLUMN "ip_address" text;
ALTER TABLE "activity_log" ADD COLUMN "user_agent" text;

ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

UPDATE "activity_log" al
SET 
  org_id = u.org_id,
  action = 'deleted',
  entity_type = CASE 
    WHEN entity_type = 'contacts' THEN 'contact'
    WHEN entity_type = 'products' THEN 'product'
    WHEN entity_type = 'shipments' THEN 'shipment'
    WHEN entity_type = 'invoices' THEN 'invoice'
    WHEN entity_type = 'compliance_items' THEN 'compliance'
    WHEN entity_type = 'cost_items' THEN 'cost-item'
    WHEN entity_type = 'financial_projections' THEN 'financial-projection'
    WHEN entity_type = 'outreach_contacts' THEN 'outreach-contact'
    WHEN entity_type = 'email_templates' THEN 'email-template'
    WHEN entity_type = 'campaigns' THEN 'campaign'
    WHEN entity_type = 'business_plan_sections' THEN 'business-plan'
    WHEN entity_type = 'swot_items' THEN 'swot'
    WHEN entity_type = 'tasks' THEN 'task'
    ELSE entity_type
  END
FROM "users" u
WHERE al.user_id = u.id;

ALTER TABLE "activity_log" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "activity_log" ALTER COLUMN "action" SET NOT NULL;

DROP INDEX IF EXISTS "idx_deletion_logs_deleted_by_user_id";
CREATE INDEX IF NOT EXISTS "idx_activity_log_org_created" ON "activity_log" ("org_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_activity_log_entity" ON "activity_log" ("entity_type", "entity_id");

COMMIT;
