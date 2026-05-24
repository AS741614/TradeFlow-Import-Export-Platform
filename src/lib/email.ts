// ============================================================
// TradeFlow — Email Service & Campaign Runner
// ============================================================

import { getItems, setItems, STORAGE_KEYS } from './storage';
import { renderTemplate } from './templateEngine';
import { nowISO } from './utils';
import type { Campaign, OutreachContact, EmailTemplate } from './types';

/**
 * Runs a campaign and simulates sending emails to all selected contacts.
 * Generates realistic delivery, open, click, and reply stats.
 */
export function runCampaignSimulation(campaignId: string): void {
  const campaigns = getItems<Campaign>(STORAGE_KEYS.CAMPAIGNS);
  const campaignIndex = campaigns.findIndex((c) => c.id === campaignId);
  if (campaignIndex === -1) return;

  const campaign = campaigns[campaignIndex];
  const contacts = getItems<OutreachContact>(STORAGE_KEYS.OUTREACH_CONTACTS);
  const templates = getItems<EmailTemplate>(STORAGE_KEYS.EMAIL_TEMPLATES);

  const template = templates.find((t) => t.id === campaign.templateId);
  if (!template) return;

  // Filter contacts belonging to the campaign
  const campaignContacts = contacts.filter((c) => campaign.contactIds.includes(c.id));
  const total = campaignContacts.length;

  if (total === 0) {
    campaigns[campaignIndex].status = 'completed';
    campaigns[campaignIndex].updatedAt = nowISO();
    setItems(STORAGE_KEYS.CAMPAIGNS, campaigns);
    return;
  }

  // Update status to sending
  campaigns[campaignIndex].status = 'sending';
  campaigns[campaignIndex].updatedAt = nowISO();
  setItems(STORAGE_KEYS.CAMPAIGNS, campaigns);

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
    const freshCampaigns = getItems<Campaign>(STORAGE_KEYS.CAMPAIGNS);
    const idx = freshCampaigns.findIndex((c) => c.id === campaignId);
    if (idx !== -1) {
      freshCampaigns[idx].status = 'completed';
      freshCampaigns[idx].stats = {
        total,
        sent: total,
        delivered: deliveredCount,
        opened: openedCount,
        clicked: clickedCount,
        replied: repliedCount,
        bounced: bouncedCount,
        failed: failedCount,
      };
      freshCampaigns[idx].updatedAt = nowISO();
      setItems(STORAGE_KEYS.CAMPAIGNS, freshCampaigns);
    }

    // Update contacts' campaign histories
    const freshContacts = getItems<OutreachContact>(STORAGE_KEYS.OUTREACH_CONTACTS);
    const updatedContacts = freshContacts.map((contact) => {
      if (campaign.contactIds.includes(contact.id)) {
        // Determine status for this specific contact
        let contactEmailStatus: any = 'sent';
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

        const existingHistory = contact.campaignHistory || [];
        return {
          ...contact,
          lastContacted: nowISO(),
          campaignHistory: [
            ...existingHistory.filter((h) => h.campaignId !== campaignId),
            { campaignId, status: contactEmailStatus },
          ],
        };
      }
      return contact;
    });
    setItems(STORAGE_KEYS.OUTREACH_CONTACTS, updatedContacts);
  }, 1500); // 1.5s delay to make it feel authentic
}
