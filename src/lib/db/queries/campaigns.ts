import { getDb } from '../client';
import { campaigns, campaignContacts } from '../schema';
import { eq } from 'drizzle-orm';
import { withTenant, deleteWithLog } from './base';
import { DEFAULT_ORG_ID } from '../constants';
import type { InsertCampaignInput, UpdateCampaignInput } from '../validation/campaigns';

export async function getCampaigns() {
  const db = getDb();
  const campaignRows = await db.select().from(campaigns).where(withTenant(campaigns));
  
  const results = [];
  for (const campaign of campaignRows) {
    const contactRows = await db.select({ contactId: campaignContacts.contactId })
      .from(campaignContacts)
      .where(eq(campaignContacts.campaignId, campaign.id));
    results.push({
      ...campaign,
      contactIds: contactRows.map(r => r.contactId),
    });
  }
  return results;
}

export async function getCampaignById(id: string) {
  const db = getDb();
  const campaignRows = await db.select().from(campaigns).where(
    withTenant(campaigns, eq(campaigns.id, id))
  );
  const campaign = campaignRows[0] ?? null;
  if (!campaign) return null;
  
  const contactRows = await db.select({ contactId: campaignContacts.contactId })
    .from(campaignContacts)
    .where(eq(campaignContacts.campaignId, campaign.id));
  return {
    ...campaign,
    contactIds: contactRows.map(r => r.contactId),
  };
}

export async function createCampaign(data: InsertCampaignInput) {
  const db = getDb();
  const { contactIds, ...campaignData } = data;
  
  return db.transaction(async (tx) => {
    const rows = await tx.insert(campaigns).values({
      ...campaignData,
      orgId: DEFAULT_ORG_ID,
    }).returning();
    
    const campaign = rows[0];
    if (!campaign) {
      throw new Error('Failed to create campaign');
    }
    
    if (contactIds.length > 0) {
      await tx.insert(campaignContacts).values(
        contactIds.map(contactId => ({
          campaignId: campaign.id,
          contactId,
          status: 'pending' as const,
        }))
      );
    }
    
    return {
      ...campaign,
      contactIds,
    };
  });
}

export async function updateCampaign(id: string, data: UpdateCampaignInput) {
  const db = getDb();
  const { contactIds, ...campaignData } = data;
  
  return db.transaction(async (tx) => {
    const rows = await tx.update(campaigns)
      .set({
        ...campaignData,
        updatedAt: new Date().toISOString(),
      })
      .where(withTenant(campaigns, eq(campaigns.id, id)))
      .returning();
    
    const campaign = rows[0] ?? null;
    if (!campaign) {
      return null;
    }
    
    if (contactIds !== undefined) {
      await tx.delete(campaignContacts).where(eq(campaignContacts.campaignId, id));
      
      if (contactIds.length > 0) {
        await tx.insert(campaignContacts).values(
          contactIds.map(contactId => ({
            campaignId: id,
            contactId,
            status: 'pending' as const,
          }))
        );
      }
    }
    
    const finalContactRows = await tx.select({ contactId: campaignContacts.contactId })
      .from(campaignContacts)
      .where(eq(campaignContacts.campaignId, id));
    
    return {
      ...campaign,
      contactIds: finalContactRows.map(r => r.contactId),
    };
  });
}

export async function deleteCampaign(id: string, reason?: string) {
  return deleteWithLog(
    'campaigns',
    id,
    async (tx) => {
      const rows = await tx.select().from(campaigns).where(
        withTenant(campaigns, eq(campaigns.id, id))
      );
      const campaign = rows[0] ?? null;
      if (!campaign) return null;

      const contactRows = await tx.select({ contactId: campaignContacts.contactId })
        .from(campaignContacts)
        .where(eq(campaignContacts.campaignId, id));

      return {
        ...campaign,
        contactIds: contactRows.map(r => r.contactId),
      };
    },
    async (tx) => {
      await tx.delete(campaigns).where(
        withTenant(campaigns, eq(campaigns.id, id))
      );
    },
    reason
  );
}
