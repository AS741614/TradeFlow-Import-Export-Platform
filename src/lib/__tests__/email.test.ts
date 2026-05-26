import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runCampaignSimulation } from '../email';
import { getItems } from '../storage';
import { renderTemplate } from '../templateEngine';
import type { Campaign, OutreachContact, EmailTemplate } from '../types';

describe('runCampaignSimulation', () => {
  const campaignId = 'camp-123';
  const templateId = 'temp-456';
  
  // In-memory mock database for simulated API
  let mockDb: Record<string, unknown[]> = {};

  beforeEach(() => {
    mockDb = {
      campaigns: [],
      'outreach-contacts': [],
      'email-templates': [],
    };

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-25T12:00:00Z'));
    vi.spyOn(console, 'error').mockImplementation(() => { /* no-op */ });

    // Stub global fetch to behave like the REST API over mockDb
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, options?: RequestInit) => {
        const parsedUrl = new URL(url, 'http://localhost');
        const path = parsedUrl.pathname;
        const parts = path.split('/').filter(Boolean); // ["api", "entity", "id"]
        const collection = parts[1];

        if (!collection || !mockDb[collection]) {
          return Promise.resolve({
            ok: false,
            status: 404,
            json: () => Promise.resolve({ error: `Collection ${String(collection)} not found` }),
          } as unknown as Response);
        }

        const method = options?.method ?? 'GET';

        if (method === 'GET') {
          if (parts.length === 3) {
            const id = parts[2];
            const item = mockDb[collection].find((i) => (i as { id: string }).id === id);
            if (!item) {
              return Promise.resolve({
                ok: false,
                status: 404,
                json: () => Promise.resolve({ error: 'Not found' }),
              } as unknown as Response);
            }
            return Promise.resolve({
              ok: true,
              status: 200,
              json: () => Promise.resolve({ data: item }),
            } as unknown as Response);
          } else {
            return Promise.resolve({
              ok: true,
              status: 200,
              json: () => Promise.resolve({ data: mockDb[collection] }),
            } as unknown as Response);
          }
        }

        if (method === 'POST') {
          const body = JSON.parse(options?.body as string) as unknown;
          mockDb[collection].push(body);
          return Promise.resolve({
            ok: true,
            status: 201,
            json: () => Promise.resolve({ data: body }),
          } as unknown as Response);
        }

        if (method === 'PATCH') {
          const id = parts[2];
          const body = JSON.parse(options?.body as string) as Record<string, unknown>;
          const index = mockDb[collection].findIndex((i) => (i as { id: string }).id === id);
          if (index !== -1) {
            mockDb[collection][index] = { ...(mockDb[collection][index] as Record<string, unknown>), ...body };
          }
          const updatedItem = index !== -1 ? mockDb[collection][index] : null;
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ data: updatedItem }),
          } as unknown as Response);
        }

        if (method === 'DELETE') {
          const id = parts[2];
          const item = mockDb[collection].find((i) => (i as { id: string }).id === id);
          mockDb[collection] = mockDb[collection].filter((i) => (i as { id: string }).id !== id);
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ data: item }),
          } as unknown as Response);
        }

        return Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ error: 'Bad Request' }),
        } as unknown as Response);
      })
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
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

    mockDb['outreach-contacts'] = contacts;
    mockDb['email-templates'] = [template];
    mockDb.campaigns = [campaign];

    return { contacts, template, campaign };
  };

  it('should do nothing when campaign ID is not present in storage', async () => {
    setupMockData();
    await runCampaignSimulation('missing-campaign-id');
    
    const campaigns = await getItems<Campaign>('campaigns');
    expect(campaigns[0]?.status).toBe('draft');
  });

  it('should do nothing when template ID is not present in storage', async () => {
    const { campaign } = setupMockData();
    campaign.templateId = 'missing-template';
    mockDb.campaigns = [campaign];

    await runCampaignSimulation(campaignId);
    
    const campaigns = await getItems<Campaign>('campaigns');
    expect(campaigns[0]?.status).toBe('draft');
  });

  it('should transition status to completed immediately when contactIds is empty', async () => {
    setupMockData(0);
    
    await runCampaignSimulation(campaignId);
    
    const campaigns = await getItems<Campaign>('campaigns');
    expect(campaigns[0]?.status).toBe('completed');
    expect(campaigns[0]?.updatedAt).toBe('2026-05-25T12:00:00.000Z');
  });

  it('should update campaign status to sending and then completed using timers', async () => {
    setupMockData(1);
    
    await runCampaignSimulation(campaignId);
    
    let campaigns = await getItems<Campaign>('campaigns');
    expect(campaigns[0]?.status).toBe('sending');
    
    await vi.advanceTimersByTimeAsync(1500);
    
    campaigns = await getItems<Campaign>('campaigns');
    expect(campaigns[0]?.status).toBe('completed');
  });

  it('should aggregate campaign performance statistics correctly', async () => {
    setupMockData(10);
    
    await runCampaignSimulation(campaignId);
    await vi.advanceTimersByTimeAsync(1500);
    
    const campaigns = await getItems<Campaign>('campaigns');
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

  it('should update contacts campaign history and contacted timestamps in storage', async () => {
    setupMockData(1);
    
    await runCampaignSimulation(campaignId);
    await vi.advanceTimersByTimeAsync(1500);
    
    const contacts = await getItems<OutreachContact>('outreach_contacts');
    expect(contacts[0]?.lastContacted).toBe('2026-05-25T12:00:01.500Z');
    expect(contacts[0]?.campaignHistory.length).toBe(1);
    expect(contacts[0]?.campaignHistory[0]?.campaignId).toBe(campaignId);
  });

  it('should distribute email outcomes deterministically when Math.random is mocked', async () => {
    setupMockData(5);
    
    let callCount = 0;
    const randomMockValues = [0.01, 0.1, 0.3, 0.6, 0.9];
    vi.spyOn(Math, 'random').mockImplementation(() => {
      return randomMockValues[callCount++] ?? 0.5;
    });

    await runCampaignSimulation(campaignId);
    await vi.advanceTimersByTimeAsync(1500);

    const contacts = await getItems<OutreachContact>('outreach_contacts');
    expect(contacts[0]?.campaignHistory[0]?.status).toBe('bounced');
    expect(contacts[1]?.campaignHistory[0]?.status).toBe('replied');
    expect(contacts[2]?.campaignHistory[0]?.status).toBe('clicked');
    expect(contacts[3]?.campaignHistory[0]?.status).toBe('opened');
    expect(contacts[4]?.campaignHistory[0]?.status).toBe('delivered');
  });

  it('should skip individual contacts that do not exist in storage when other contacts in contactIds do exist', async () => {
    const { campaign } = setupMockData(2);
    campaign.contactIds.push('contact-missing');
    
    const contacts = await getItems<OutreachContact>('outreach_contacts');
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
    mockDb['outreach-contacts'] = contacts;
    mockDb.campaigns = [campaign];

    await runCampaignSimulation(campaignId);
    await vi.advanceTimersByTimeAsync(1500);

    const campaigns = await getItems<Campaign>('campaigns');
    const stats = campaigns[0]?.stats;
    
    expect(stats?.total).toBe(2);
    expect(stats?.sent).toBe(2);

    const freshContacts = await getItems<OutreachContact>('outreach_contacts');
    const untargeted = freshContacts.find(c => c.id === 'untargeted-contact');
    expect(untargeted?.lastContacted).toBeUndefined();
    expect(untargeted?.campaignHistory).toEqual([]);
  });

  it('should handle campaign deletion before timer fires gracefully', async () => {
    setupMockData(1);
    await runCampaignSimulation(campaignId);
    
    mockDb.campaigns = [];
    
    // We expect the async callback to run, but not throw when it can't find the campaign
    await expect(vi.advanceTimersByTimeAsync(1500)).resolves.not.toThrow();
    
    const campaigns = await getItems<Campaign>('campaigns');
    expect(campaigns.length).toBe(0);
  });

  it('should compute deliverable count as total minus bounced', async () => {
    for (const total of [1, 5, 10, 23, 100]) {
      setupMockData(total);
      
      await runCampaignSimulation(campaignId);
      await vi.advanceTimersByTimeAsync(1500);

      const campaigns = await getItems<Campaign>('campaigns');
      const stats = campaigns[0]?.stats;

      expect(stats?.delivered).toBe((stats?.total ?? 0) - (stats?.bounced ?? 0));
    }
  });

  it('should compute clicked count as subset of opened (clicks require opens)', async () => {
    for (const total of [1, 5, 10, 23, 100]) {
      setupMockData(total);
      
      await runCampaignSimulation(campaignId);
      await vi.advanceTimersByTimeAsync(1500);

      const campaigns = await getItems<Campaign>('campaigns');
      const stats = campaigns[0]?.stats;

      expect(stats?.clicked).toBeLessThanOrEqual(stats?.opened ?? 0);
    }
  });

  it('should compute replied count as subset of clicked (replies require clicks)', async () => {
    for (const total of [1, 5, 10, 23, 100]) {
      setupMockData(total);
      
      await runCampaignSimulation(campaignId);
      await vi.advanceTimersByTimeAsync(1500);

      const campaigns = await getItems<Campaign>('campaigns');
      const stats = campaigns[0]?.stats;

      expect(stats?.replied).toBeLessThanOrEqual(stats?.clicked ?? 0);
    }
  });

  it('should be idempotent — calling twice on a completed campaign should not double-count statistics (or document current behavior if non-idempotent)', async () => {
    setupMockData(5);

    await runCampaignSimulation(campaignId);
    
    let campaigns = await getItems<Campaign>('campaigns');
    expect(campaigns[0]?.status).toBe('sending');
    
    await vi.advanceTimersByTimeAsync(1500);
    
    campaigns = await getItems<Campaign>('campaigns');
    expect(campaigns[0]?.status).toBe('completed');
    const firstStats = campaigns[0]?.stats;

    await runCampaignSimulation(campaignId);
    
    campaigns = await getItems<Campaign>('campaigns');
    expect(campaigns[0]?.status).toBe('sending');
    
    await vi.advanceTimersByTimeAsync(1500);
    
    campaigns = await getItems<Campaign>('campaigns');
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

  it('should handle the case where wizard subject/preheader contain template tokens — substitution still works', async () => {
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

    const campaigns = await getItems<Campaign>('campaigns');
    const campaign = campaigns[0];
    if (campaign) {
      campaign.subjectLineA = 'Hello {{ first_name }}';
      mockDb.campaigns = [campaign];
    }

    await runCampaignSimulation(campaignId);
    await vi.advanceTimersByTimeAsync(1500);

    const completedCampaigns = await getItems<Campaign>('campaigns');
    expect(completedCampaigns[0]?.status).toBe('completed');
    expect(completedCampaigns[0]?.subjectLineA).toBe('Hello {{ first_name }}');
  });

  it('should preserve existing campaign metadata fields (name, scheduledAt) when transitioning status', async () => {
    const { campaign } = setupMockData(2);
    campaign.name = 'Q2 Expansion Outreach';
    campaign.schedule = {
      type: 'scheduled',
      scheduledAt: '2026-06-01T12:00:00Z',
      sendsPerHour: 20,
    };
    mockDb.campaigns = [campaign];

    await runCampaignSimulation(campaignId);
    let campaigns = await getItems<Campaign>('campaigns');
    expect(campaigns[0]?.status).toBe('sending');
    expect(campaigns[0]?.name).toBe('Q2 Expansion Outreach');
    expect(campaigns[0]?.schedule.type).toBe('scheduled');
    expect(campaigns[0]?.schedule.scheduledAt).toBe('2026-06-01T12:00:00Z');
    expect(campaigns[0]?.schedule.sendsPerHour).toBe(20);

    await vi.advanceTimersByTimeAsync(1500);
    campaigns = await getItems<Campaign>('campaigns');
    expect(campaigns[0]?.status).toBe('completed');
    expect(campaigns[0]?.name).toBe('Q2 Expansion Outreach');
    expect(campaigns[0]?.schedule.type).toBe('scheduled');
    expect(campaigns[0]?.schedule.scheduledAt).toBe('2026-06-01T12:00:00Z');
    expect(campaigns[0]?.schedule.sendsPerHour).toBe(20);
  });
});
