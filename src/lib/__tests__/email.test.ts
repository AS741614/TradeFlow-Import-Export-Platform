import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runCampaignSimulation } from '../email';
import { getItems, setItems, STORAGE_KEYS } from '../storage';
import { renderTemplate } from '../templateEngine';
import type { Campaign, OutreachContact, EmailTemplate } from '../types';

describe('runCampaignSimulation', () => {
  const campaignId = 'camp-123';
  const templateId = 'temp-456';
  
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-25T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const setupMockData = (contactCount = 5) => {
    const contacts: OutreachContact[] = [];
    const contactIds: string[] = [];
    
    for (let i = 0; i < contactCount; i++) {
      const id = `contact-${String(i)}`;
      contactIds.push(id);
      contacts.push({
        id,
        firstName: `First-${String(i)}`,
        lastName: `Last-${String(i)}`,
        email: `contact-${String(i)}@example.com`,
        company: `Company-${String(i)}`,
        phone: `123-456-${String(i)}`,
        country: 'United States',
        tags: ['imported'],
        source: 'manual',
        importedAt: '2026-05-25T11:00:00Z',
        campaignHistory: [],
      });
    }

    const template: EmailTemplate = {
      id: templateId,
      name: 'Welcome Template',
      category: 'introduction',
      subject: 'Hello {{first_name}} from {{company}}',
      body: '<p>Welcome!</p>',
      variables: ['first_name', 'company'],
      createdAt: '2026-05-25T11:00:00Z',
      updatedAt: '2026-05-25T11:00:00Z',
    };

    const campaign: Campaign = {
      id: campaignId,
      name: 'Outreach Campaign',
      templateId,
      contactIds,
      status: 'draft',
      schedule: {
        type: 'immediate',
      },
      subjectLineA: 'Partnership Offer for {{company}}',
      stats: {
        total: 0,
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        replied: 0,
        bounced: 0,
        failed: 0,
      },
      createdAt: '2026-05-25T11:00:00Z',
      updatedAt: '2026-05-25T11:00:00Z',
    };

    setItems(STORAGE_KEYS.OUTREACH_CONTACTS, contacts);
    setItems(STORAGE_KEYS.EMAIL_TEMPLATES, [template]);
    setItems(STORAGE_KEYS.CAMPAIGNS, [campaign]);

    return { contacts, template, campaign };
  };

  it('should do nothing when campaign ID is not present in storage', () => {
    setupMockData();
    runCampaignSimulation('missing-campaign-id');
    
    const campaigns = getItems<Campaign>(STORAGE_KEYS.CAMPAIGNS);
    expect(campaigns[0]?.status).toBe('draft');
  });

  it('should do nothing when template ID is not present in storage', () => {
    const { campaign } = setupMockData();
    campaign.templateId = 'missing-template';
    setItems(STORAGE_KEYS.CAMPAIGNS, [campaign]);

    runCampaignSimulation(campaignId);
    
    const campaigns = getItems<Campaign>(STORAGE_KEYS.CAMPAIGNS);
    expect(campaigns[0]?.status).toBe('draft');
  });

  it('should transition status to completed immediately when contactIds is empty', () => {
    setupMockData(0);
    
    runCampaignSimulation(campaignId);
    
    const campaigns = getItems<Campaign>(STORAGE_KEYS.CAMPAIGNS);
    expect(campaigns[0]?.status).toBe('completed');
    expect(campaigns[0]?.updatedAt).toBe('2026-05-25T12:00:00.000Z');
  });

  it('should update campaign status to sending and then completed using timers', () => {
    setupMockData(1);
    
    runCampaignSimulation(campaignId);
    
    let campaigns = getItems<Campaign>(STORAGE_KEYS.CAMPAIGNS);
    expect(campaigns[0]?.status).toBe('sending');
    
    vi.advanceTimersByTime(1500);
    
    campaigns = getItems<Campaign>(STORAGE_KEYS.CAMPAIGNS);
    expect(campaigns[0]?.status).toBe('completed');
  });

  it('should aggregate campaign performance statistics correctly', () => {
    setupMockData(10);
    
    runCampaignSimulation(campaignId);
    vi.advanceTimersByTime(1500);
    
    const campaigns = getItems<Campaign>(STORAGE_KEYS.CAMPAIGNS);
    const stats = campaigns[0]?.stats;
    
    expect(stats?.total).toBe(10);
    expect(stats?.sent).toBe(10);
    expect(stats?.delivered).toBe(10);
    expect(stats?.bounced).toBe(0);
    expect(stats?.opened).toBe(6);
    expect(stats?.clicked).toBe(2);
    expect(stats?.replied).toBe(1);
    expect(stats?.failed).toBe(0);
  });

  it('should update contacts campaign history and contacted timestamps in storage', () => {
    setupMockData(1);
    
    runCampaignSimulation(campaignId);
    vi.advanceTimersByTime(1500);
    
    const contacts = getItems<OutreachContact>(STORAGE_KEYS.OUTREACH_CONTACTS);
    expect(contacts[0]?.lastContacted).toBe('2026-05-25T12:00:01.500Z');
    expect(contacts[0]?.campaignHistory.length).toBe(1);
    expect(contacts[0]?.campaignHistory[0]?.campaignId).toBe(campaignId);
  });

  it('should distribute email outcomes deterministically when Math.random is mocked', () => {
    setupMockData(5);
    
    let callCount = 0;
    const randomMockValues = [0.01, 0.1, 0.3, 0.6, 0.9];
    vi.spyOn(Math, 'random').mockImplementation(() => {
      return randomMockValues[callCount++] ?? 0.5;
    });

    runCampaignSimulation(campaignId);
    vi.advanceTimersByTime(1500);

    const contacts = getItems<OutreachContact>(STORAGE_KEYS.OUTREACH_CONTACTS);
    expect(contacts[0]?.campaignHistory[0]?.status).toBe('bounced');
    expect(contacts[1]?.campaignHistory[0]?.status).toBe('replied');
    expect(contacts[2]?.campaignHistory[0]?.status).toBe('clicked');
    expect(contacts[3]?.campaignHistory[0]?.status).toBe('opened');
    expect(contacts[4]?.campaignHistory[0]?.status).toBe('delivered');
  });

  it('should skip individual contacts that do not exist in storage when other contacts in contactIds do exist', () => {
    const { campaign } = setupMockData(2);
    campaign.contactIds.push('contact-missing');
    
    const contacts = getItems<OutreachContact>(STORAGE_KEYS.OUTREACH_CONTACTS);
    contacts.push({
      id: 'untargeted-contact',
      firstName: 'Untargeted',
      lastName: 'User',
      email: 'untargeted@example.com',
      company: 'Other Corp',
      country: 'United States',
      tags: [],
      source: 'manual',
      importedAt: '2026-05-25T11:00:00Z',
      campaignHistory: [],
    });
    setItems(STORAGE_KEYS.OUTREACH_CONTACTS, contacts);
    setItems(STORAGE_KEYS.CAMPAIGNS, [campaign]);

    runCampaignSimulation(campaignId);
    vi.advanceTimersByTime(1500);

    const campaigns = getItems<Campaign>(STORAGE_KEYS.CAMPAIGNS);
    const stats = campaigns[0]?.stats;
    
    expect(stats?.total).toBe(2);
    expect(stats?.sent).toBe(2);

    const freshContacts = getItems<OutreachContact>(STORAGE_KEYS.OUTREACH_CONTACTS);
    const untargeted = freshContacts.find(c => c.id === 'untargeted-contact');
    expect(untargeted?.lastContacted).toBeUndefined();
    expect(untargeted?.campaignHistory).toEqual([]);
  });

  it('should handle campaign deletion before timer fires gracefully', () => {
    setupMockData(1);
    runCampaignSimulation(campaignId);
    
    setItems(STORAGE_KEYS.CAMPAIGNS, []);
    
    expect(() => vi.advanceTimersByTime(1500)).not.toThrow();
    
    const campaigns = getItems<Campaign>(STORAGE_KEYS.CAMPAIGNS);
    expect(campaigns.length).toBe(0);
  });

  it('should compute deliverable count as total minus bounced', () => {
    for (const total of [1, 5, 10, 23, 100]) {
      setupMockData(total);
      
      runCampaignSimulation(campaignId);
      vi.advanceTimersByTime(1500);

      const campaigns = getItems<Campaign>(STORAGE_KEYS.CAMPAIGNS);
      const stats = campaigns[0]?.stats;

      expect(stats?.delivered).toBe((stats?.total ?? 0) - (stats?.bounced ?? 0));
    }
  });

  it('should compute clicked count as subset of opened (clicks require opens)', () => {
    for (const total of [1, 5, 10, 23, 100]) {
      setupMockData(total);
      
      runCampaignSimulation(campaignId);
      vi.advanceTimersByTime(1500);

      const campaigns = getItems<Campaign>(STORAGE_KEYS.CAMPAIGNS);
      const stats = campaigns[0]?.stats;

      expect(stats?.clicked).toBeLessThanOrEqual(stats?.opened ?? 0);
    }
  });

  it('should compute replied count as subset of clicked (replies require clicks)', () => {
    for (const total of [1, 5, 10, 23, 100]) {
      setupMockData(total);
      
      runCampaignSimulation(campaignId);
      vi.advanceTimersByTime(1500);

      const campaigns = getItems<Campaign>(STORAGE_KEYS.CAMPAIGNS);
      const stats = campaigns[0]?.stats;

      expect(stats?.replied).toBeLessThanOrEqual(stats?.clicked ?? 0);
    }
  });

  it('should be idempotent — calling twice on a completed campaign should not double-count statistics (or document current behavior if non-idempotent)', () => {
    setupMockData(5);

    runCampaignSimulation(campaignId);
    
    let campaigns = getItems<Campaign>(STORAGE_KEYS.CAMPAIGNS);
    expect(campaigns[0]?.status).toBe('sending');
    
    vi.advanceTimersByTime(1500);
    
    campaigns = getItems<Campaign>(STORAGE_KEYS.CAMPAIGNS);
    expect(campaigns[0]?.status).toBe('completed');
    const firstStats = campaigns[0]?.stats;

    runCampaignSimulation(campaignId);
    
    campaigns = getItems<Campaign>(STORAGE_KEYS.CAMPAIGNS);
    expect(campaigns[0]?.status).toBe('sending');
    
    vi.advanceTimersByTime(1500);
    
    campaigns = getItems<Campaign>(STORAGE_KEYS.CAMPAIGNS);
    expect(campaigns[0]?.status).toBe('completed');
    const secondStats = campaigns[0]?.stats;

    expect(secondStats?.total).toBe(firstStats?.total);
    expect(secondStats?.sent).toBe(firstStats?.sent);
    expect(secondStats?.delivered).toBe(firstStats?.delivered);
    expect(secondStats?.opened).toBe(firstStats?.opened);
    expect(secondStats?.clicked).toBe(firstStats?.clicked);
    expect(secondStats?.replied).toBe(firstStats?.replied);
    expect(secondStats?.bounced).toBe(firstStats?.bounced);
  });

  it('should handle the case where wizard subject/preheader contain template tokens — substitution still works', () => {
    const { contacts } = setupMockData(1);
    
    const subjectTemplate = 'Partnership Offer for {{ company }} in {{ custom-country }}';
    const rendered = renderTemplate(
      subjectTemplate,
      contacts[0] ?? {
        id: '',
        firstName: '',
        lastName: '',
        email: '',
        company: '',
        country: '',
        tags: [],
        source: 'manual',
        importedAt: '',
        campaignHistory: [],
      },
      { 'custom-country': 'Canada' }
    );
    
    expect(rendered).toBe('Partnership Offer for Company-0 in Canada');

    const campaigns = getItems<Campaign>(STORAGE_KEYS.CAMPAIGNS);
    const campaign = campaigns[0];
    if (campaign) {
      campaign.subjectLineA = 'Hello {{ first_name }}';
      setItems(STORAGE_KEYS.CAMPAIGNS, [campaign]);
    }

    runCampaignSimulation(campaignId);
    vi.advanceTimersByTime(1500);

    const completedCampaigns = getItems<Campaign>(STORAGE_KEYS.CAMPAIGNS);
    expect(completedCampaigns[0]?.status).toBe('completed');
    expect(completedCampaigns[0]?.subjectLineA).toBe('Hello {{ first_name }}');
  });

  it('should preserve existing campaign metadata fields (name, scheduledAt) when transitioning status', () => {
    const { campaign } = setupMockData(2);
    campaign.name = 'Q2 Expansion Outreach';
    campaign.schedule = {
      type: 'scheduled',
      scheduledAt: '2026-06-01T12:00:00Z',
      sendsPerHour: 20,
    };
    setItems(STORAGE_KEYS.CAMPAIGNS, [campaign]);

    runCampaignSimulation(campaignId);
    let campaigns = getItems<Campaign>(STORAGE_KEYS.CAMPAIGNS);
    expect(campaigns[0]?.status).toBe('sending');
    expect(campaigns[0]?.name).toBe('Q2 Expansion Outreach');
    expect(campaigns[0]?.schedule.type).toBe('scheduled');
    expect(campaigns[0]?.schedule.scheduledAt).toBe('2026-06-01T12:00:00Z');
    expect(campaigns[0]?.schedule.sendsPerHour).toBe(20);

    vi.advanceTimersByTime(1500);
    campaigns = getItems<Campaign>(STORAGE_KEYS.CAMPAIGNS);
    expect(campaigns[0]?.status).toBe('completed');
    expect(campaigns[0]?.name).toBe('Q2 Expansion Outreach');
    expect(campaigns[0]?.schedule.type).toBe('scheduled');
    expect(campaigns[0]?.schedule.scheduledAt).toBe('2026-06-01T12:00:00Z');
    expect(campaigns[0]?.schedule.sendsPerHour).toBe(20);
  });
});
