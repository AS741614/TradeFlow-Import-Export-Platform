import { getDb, closeDb } from '../src/lib/db/client';
import * as schema from '../src/lib/db/schema';
import { DEFAULT_ORG_ID, DEFAULT_USER_ID } from '../src/lib/db/constants';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('Seeding database with default organization and user...');
  const db = getDb();

  try {
    await db.transaction(async (tx) => {
      // 1. Check/Insert Default Org
      const existingOrg = await tx.select().from(schema.orgs).where(eq(schema.orgs.id, DEFAULT_ORG_ID));
      if (existingOrg.length === 0) {
        console.log(`Creating default organization (ID: ${DEFAULT_ORG_ID})...`);
        await tx.insert(schema.orgs).values({
          id: DEFAULT_ORG_ID,
          name: 'Default Test Org',
          country: 'Canada',
        });
      } else {
        console.log('Default organization already exists.');
      }

      // 2. Check/Insert Default User
      const existingUser = await tx.select().from(schema.users).where(eq(schema.users.id, DEFAULT_USER_ID));
      if (existingUser.length === 0) {
        console.log(`Creating default user (ID: ${DEFAULT_USER_ID})...`);
        await tx.insert(schema.users).values({
          id: DEFAULT_USER_ID,
          email: 'default-owner@tradeflow.local',
          displayName: 'Default Owner',
          orgId: DEFAULT_ORG_ID,
          role: 'owner',
        });
      } else {
        console.log('Default user already exists.');
      }
    });

    console.log('Database seeding completed successfully!');
    await closeDb();
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed database:', error);
    await closeDb();
    process.exit(1);
  }
}

void seed();
