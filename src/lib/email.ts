// ============================================================
// TradeFlow — Email Service & Campaign Runner
// ============================================================

import { getItems, updateItem } from './storage';
import { nowISO } from './utils';
import type { Campaign, OutreachContact, EmailTemplate, EmailStatus } from './types';

/**
 * Runs a campaign and simulates sending emails to all selected contacts.
 * Generates realistic delivery, open, click, and reply stats.
 */
export async function runCampaignSimulation(campaignId: string): Promise<void> {
  const campaigns = await getItems<Campaign>('campaigns');
  const campaignIndex = campaigns.findIndex((c) => c.id === campaignId);
  if (campaignIndex === -1) return;

  const campaign = campaigns[campaignIndex];
  if (!campaign) return;

  const contacts = await getItems<OutreachContact>('outreach_contacts');
  const templates = await getItems<EmailTemplate>('email_templates');

  const template = templates.find((t) => t.id === campaign.templateId);
  if (!template) return;

  // Filter contacts belonging to the campaign
  const campaignContacts = contacts.filter((c) => campaign.contactIds.includes(c.id));
  const total = campaignContacts.length;

  if (total === 0) {
    await updateItem<Campaign>('campaigns', campaign.id, {
      status: 'completed',
      updatedAt: nowISO(),
    });
    return;
  }

  // Update status to sending
  await updateItem<Campaign>('campaigns', campaign.id, {
    status: 'sending',
    updatedAt: nowISO(),
  });

  // We will simulate sending.
  // We'll calculate some realistic ratios for stats:
  // - Delivery rate: 98%
  // - Open rate: 45% - 65%
  // - Click rate: 15% - 30%
  // - Reply rate: 5% - 15%
  // - Bounce rate: 1% - 2%

  const deliveredCount = Math.round(total * 0.97);
  const bouncedCount = total - deliveredCount;
  const openedCount = Math.round(deliveredCount * 0.55);
  const clickedCount = Math.round(openedCount * 0.28);
  const repliedCount = Math.round(clickedCount * 0.4);
  const failedCount = 0;

  // Update campaign status to completed after sending
  setTimeout(() => {
    void (async () => {
      try {
        await updateItem<Campaign>('campaigns', campaignId, {
          status: 'completed',
          stats: {
            total,
            sent: total,
            delivered: deliveredCount,
            opened: openedCount,
            clicked: clickedCount,
            replied: repliedCount,
            bounced: bouncedCount,
            failed: failedCount,
          },
          updatedAt: nowISO(),
        });

        // Update contacts' campaign histories
        for (const contact of campaignContacts) {
          // Determine status for this specific contact
          let contactEmailStatus: EmailStatus = 'sent';
          const rand = Math.random();
          if (rand < 0.03) {
            contactEmailStatus = 'bounced';
          } else if (rand < 0.2) {
            contactEmailStatus = 'replied';
          } else if (rand < 0.45) {
            contactEmailStatus = 'clicked';
          } else if (rand < 0.75) {
            contactEmailStatus = 'opened';
          } else {
            contactEmailStatus = 'delivered';
          }

          await updateItem<OutreachContact>('outreach_contacts', contact.id, {
            lastContacted: nowISO(),
            campaignHistory: [
              ...contact.campaignHistory.filter((h) => h.campaignId !== campaignId),
              { campaignId, status: contactEmailStatus },
            ],
          });
        }
      } catch (e) {
        console.error('Failed to update campaign/contacts in simulation:', e);
      }
    })();
  }, 1500); // 1.5s delay to make it feel authentic
}
