import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import * as schema from '../schema';
import { getDb, closeDb } from '../client';
import { eq } from 'drizzle-orm';

describe('schema imports', () => {
  it('should export all 17 enums from index.ts', () => {
    const EXPECTED_ENUMS = [
      'userRoleEnum',
      'productStatusEnum',
      'shipmentStatusEnum',
      'shipmentDocTypeEnum',
      'shipmentDocStatusEnum',
      'invoiceStatusEnum',
      'contactTypeEnum',
      'contactStatusEnum',
      'swotCategoryEnum',
      'taskStatusEnum',
      'taskPriorityEnum',
      'costCategoryEnum',
      'emailStatusEnum',
      'outreachSourceEnum',
      'templateCategoryEnum',
      'campaignStatusEnum',
      'campaignScheduleTypeEnum',
    ];

    const schemaRecord = schema as unknown as Record<string, unknown>;
    EXPECTED_ENUMS.forEach((enumName) => {
      expect(schema).toHaveProperty(enumName);
      expect(typeof schemaRecord[enumName]).toBe('function');
    });
  });

  it('should export all 20 tables from index.ts', () => {
    const EXPECTED_TABLES = [
      'orgs',
      'users',
      'activityLogs',
      'products',
      'contacts',
      'shipments',
      'shipmentProducts',
      'shipmentDocuments',
      'complianceItems',
      'invoices',
      'invoiceLineItems',
      'costItems',
      'financialProjections',
      'outreachContacts',
      'emailTemplates',
      'campaigns',
      'campaignContacts',
      'businessPlanSections',
      'swotItems',
      'tasks',
    ];

    const schemaRecord = schema as unknown as Record<string, unknown>;
    EXPECTED_TABLES.forEach((tableName) => {
      expect(schema).toHaveProperty(tableName);
      expect(typeof schemaRecord[tableName]).toBe('object');
    });
  });

  it('should not have duplicate names in exports', () => {
    const keys = Object.keys(schema);
    const uniqueKeys = new Set(keys);
    expect(keys.length).toBe(uniqueKeys.size);
  });
});

describe('database integration', () => {
  const db = getDb();

  beforeEach(async () => {
    // Clear test tables in reverse dependency order
    await db.delete(schema.activityLogs);
    await db.delete(schema.contacts);
    await db.delete(schema.users);
    await db.delete(schema.orgs);
  });

  afterEach(async () => {
    // Clean up after each test to keep DB pristine
    await db.delete(schema.activityLogs);
    await db.delete(schema.contacts);
    await db.delete(schema.users);
    await db.delete(schema.orgs);
  });

  afterAll(async () => {
    await closeDb();
  });

  it('should successfully connect to the database', async () => {
    const result = await db.execute('SELECT 1 as val');
    expect(result.rows).toBeDefined();
    const firstRow = result.rows[0];
    expect(firstRow).toBeDefined();
    expect(firstRow?.val).toBe(1);
  });

  it('should insert an org and return UUID and timestamps', async () => {
    const orgsResult = await db.insert(schema.orgs).values({
      name: 'Smoke Test Org',
      country: 'Canada',
    }).returning();
    const org = orgsResult[0];
    expect(org).toBeDefined();
    if (!org) return;

    expect(org.id).toBeDefined();
    expect(typeof org.id).toBe('string');
    expect(org.id.length).toBe(36);
    expect(org.createdAt).toBeDefined();
    expect(org.updatedAt).toBeDefined();
    expect(typeof org.createdAt).toBe('string');
    expect(typeof org.updatedAt).toBe('string');
  });

  it('should insert a user with a valid org_id', async () => {
    const orgsResult = await db.insert(schema.orgs).values({
      name: 'Smoke Test Org',
      country: 'Canada',
    }).returning();
    const org = orgsResult[0];
    expect(org).toBeDefined();
    if (!org) return;

    const usersResult = await db.insert(schema.users).values({
      email: 'smoke@example.com',
      displayName: 'Smoke User',
      orgId: org.id,
      role: 'admin',
    }).returning();
    const user = usersResult[0];
    expect(user).toBeDefined();
    if (!user) return;

    expect(user.id).toBeDefined();
    expect(user.orgId).toBe(org.id);
  });

  it('should throw an error when inserting a user with an invalid org_id', async () => {
    const invalidOrgId = '00000000-0000-0000-0000-000000000000';

    await expect(
      db.insert(schema.users).values({
        email: 'smoke-invalid@example.com',
        displayName: 'Smoke User Invalid',
        orgId: invalidOrgId,
        role: 'admin',
      }),
    ).rejects.toThrow();
  });

  it('should insert a contact with org_id and null created_by_user_id', async () => {
    const orgsResult = await db.insert(schema.orgs).values({
      name: 'Smoke Test Org',
      country: 'Canada',
    }).returning();
    const org = orgsResult[0];
    expect(org).toBeDefined();
    if (!org) return;

    const contactsResult = await db.insert(schema.contacts).values({
      orgId: org.id,
      company: 'No User Corp',
      contactPerson: 'Jane Doe',
      email: 'jane@nouser.com',
      phone: '555-0100',
      country: 'Canada',
      type: 'buyer',
      status: 'active',
      createdByUserId: null,
    }).returning();
    const contact = contactsResult[0];
    expect(contact).toBeDefined();
    if (!contact) return;

    expect(contact.id).toBeDefined();
    expect(contact.createdByUserId).toBeNull();
    expect(contact.orgId).toBe(org.id);
  });

  it('should update a contact and update updated_at via database trigger', async () => {
    const orgsResult = await db.insert(schema.orgs).values({
      name: 'Smoke Test Org',
      country: 'Canada',
    }).returning();
    const org = orgsResult[0];
    expect(org).toBeDefined();
    if (!org) return;

    const contactsResult = await db.insert(schema.contacts).values({
      orgId: org.id,
      company: 'Trigger Test LLC',
      contactPerson: 'John Trigger',
      email: 'john@trigger.com',
      phone: '555-0101',
      country: 'Canada',
      type: 'supplier',
      status: 'active',
    }).returning();
    const contact = contactsResult[0];
    expect(contact).toBeDefined();
    if (!contact) return;

    const firstUpdatedAt = contact.updatedAt;

    await new Promise((resolve) => setTimeout(resolve, 100));

    const updatedContactsResult = await db.update(schema.contacts)
      .set({ contactPerson: 'John Updated' })
      .where(eq(schema.contacts.id, contact.id))
      .returning();
    const updatedContact = updatedContactsResult[0];
    expect(updatedContact).toBeDefined();
    if (!updatedContact) return;

    expect(updatedContact.contactPerson).toBe('John Updated');
    expect(updatedContact.updatedAt).not.toBe(firstUpdatedAt);
  });

  it('should insert an activity_log record with a valid JSONB change_summary blob', async () => {
    const orgsResult = await db.insert(schema.orgs).values({
      name: 'Smoke Test Org',
      country: 'Canada',
    }).returning();
    const org = orgsResult[0];
    expect(org).toBeDefined();
    if (!org) return;

    const usersResult = await db.insert(schema.users).values({
      email: 'smoke-log@example.com',
      displayName: 'Smoke User',
      orgId: org.id,
      role: 'member',
    }).returning();
    const user = usersResult[0];
    expect(user).toBeDefined();
    if (!user) return;

    const testDeletedData = {
      id: 'deleted-uuid',
      company: 'Deleted Company LLC',
      type: 'buyer',
    };

    const activityLogsResult = await db.insert(schema.activityLogs).values({
      orgId: org.id,
      entityType: 'contacts',
      entityId: '11111111-2222-3333-4444-555555555555',
      action: 'deleted',
      changeSummary: { snapshot: testDeletedData },
      userId: user.id,
      reason: 'User request',
    }).returning();
    const log = activityLogsResult[0];
    expect(log).toBeDefined();
    if (!log) return;

    expect(log.id).toBeDefined();
    expect(log.changeSummary).toEqual({ snapshot: testDeletedData });
    expect(log.userId).toBe(user.id);
  });
});
