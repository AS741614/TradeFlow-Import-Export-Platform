'use client';

import { useState, useEffect } from 'react';
import { getItems, addItem, removeItem } from '@/lib/storage';
import { generateId, nowISO, toISODate } from '@/lib/utils';
import { runCampaignSimulation } from '@/lib/email';
import type { Campaign, EmailTemplate, OutreachContact } from '@/lib/types';
import { StorageError } from '@/lib/api-client';
import Loading from '@/components/Loading';
import ErrorBanner from '@/components/ErrorBanner';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { FormField } from '@/components/ui/FormField';

const INITIAL_WIZARD = {
  step: 1,
  name: '',
  templateId: '',
  contactIds: [] as string[],
  scheduleType: 'immediate' as 'immediate' | 'scheduled' | 'drip',
  scheduledAt: '',
  sendsPerHour: 50,
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [contacts, setContacts] = useState<OutreachContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());

  // Wizard state
  const [showWizard, setShowWizard] = useState(false);
  const [wizard, setWizard] = useState(INITIAL_WIZARD);
  const [contactSearch, setContactSearch] = useState('');
  const [contactTagFilter, setContactTagFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [camps, temps, conts] = await Promise.all([
          getItems<Campaign>('campaigns'),
          getItems<EmailTemplate>('email-templates'),
          getItems<OutreachContact>('outreach-contacts'),
        ]);
        if (!cancelled) {
          setCampaigns(camps);
          setTemplates(temps);
          setContacts(conts);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof StorageError ? err.message : 'Failed to load campaigns data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const openWizard = () => {
    if (templates.length === 0) {
      alert('You need to create at least one email template before creating a campaign.');
      return;
    }
    if (contacts.length === 0) {
      alert('You need to add outreach contacts to your database before running campaigns.');
      return;
    }
    setWizard({
      ...INITIAL_WIZARD,
      scheduledAt: toISODate(Date.now() + 24 * 60 * 60 * 1000),
    });
    setShowWizard(true);
  };

  const closeWizard = () => {
    setShowWizard(false);
    setWizard(INITIAL_WIZARD);
  };

  const nextStep = () => {
    if (wizard.step === 1 && !wizard.name.trim()) {
      alert('Please enter a campaign name.');
      return;
    }
    if (wizard.step === 2 && !wizard.templateId) {
      alert('Please select an email template.');
      return;
    }
    if (wizard.step === 3 && wizard.contactIds.length === 0) {
      alert('Please select at least one contact.');
      return;
    }
    setWizard({ ...wizard, step: wizard.step + 1 });
  };

  const prevStep = () => {
    setWizard({ ...wizard, step: wizard.step - 1 });
  };

  // Contacts filtering inside wizard
  const filteredWizardContacts = contacts.filter((c) => {
    const q = contactSearch.toLowerCase();
    const matchesSearch =
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q);

    const matchesTag = contactTagFilter === 'all' || c.tags.includes(contactTagFilter);
    return matchesSearch && matchesTag;
  });

  const allContactTags = Array.from(new Set(contacts.flatMap((c) => c.tags)));

  const handleToggleContact = (id: string, checked: boolean) => {
    if (checked) {
      setWizard({ ...wizard, contactIds: [...wizard.contactIds, id] });
    } else {
      setWizard({ ...wizard, contactIds: wizard.contactIds.filter((item) => item !== id) });
    }
  };

  const handleSelectAllWizardContacts = (checked: boolean) => {
    if (checked) {
      setWizard({ ...wizard, contactIds: filteredWizardContacts.map((c) => c.id) });
    } else {
      setWizard({ ...wizard, contactIds: [] });
    }
  };

  const handleRun = async (id: string) => {
    if (runningIds.has(id)) return;
    setRunningIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setError(null);
    try {
      await runCampaignSimulation(id);
      const fresh = await getItems<Campaign>('campaigns');
      setCampaigns(fresh);
    } catch (err) {
      setError(err instanceof StorageError ? err.message : 'Campaign simulation failed');
    } finally {
      setRunningIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleLaunchCampaign = async () => {
    const selectedTemplate = templates.find((t) => t.id === wizard.templateId);
    if (!selectedTemplate) return;

    setLoading(true);
    setError(null);
    try {
      const newCampaign: Campaign = {
        id: generateId(),
        name: wizard.name.trim(),
        templateId: wizard.templateId,
        contactIds: wizard.contactIds,
        status: wizard.scheduleType === 'immediate' ? 'sending' : 'scheduled',
        schedule: {
          type: wizard.scheduleType,
          scheduledAt: wizard.scheduleType === 'scheduled' ? wizard.scheduledAt : undefined,
          sendsPerHour: wizard.scheduleType === 'drip' ? wizard.sendsPerHour : undefined,
        },
        subjectLineA: selectedTemplate.subject,
        stats: {
          total: wizard.contactIds.length,
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          replied: 0,
          bounced: 0,
          failed: 0,
        },
        createdAt: nowISO(),
        updatedAt: nowISO(),
      };

      const updatedCampaigns = await addItem<Campaign>('campaigns', newCampaign);
      setCampaigns(updatedCampaigns);
      closeWizard();

      // Trigger simulation send if set to immediate
      if (wizard.scheduleType === 'immediate') {
        void handleRun(newCampaign.id);
      }
    } catch (err) {
      setError(err instanceof StorageError ? err.message : 'Failed to launch campaign');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (confirm('Are you sure you want to delete this campaign?')) {
      setLoading(true);
      setError(null);
      try {
        const updated = await removeItem<Campaign>('campaigns', id);
        setCampaigns(updated);
      } catch (err) {
        setError(err instanceof StorageError ? err.message : 'Failed to delete campaign');
      } finally {
        setLoading(false);
      }
    }
  };



  const contactColumns: Column<OutreachContact>[] = [
    {
      key: 'company',
      header: 'Company / Target',
      render: (c) => (
        <>
          <strong>{c.company}</strong> ({c.firstName})
        </>
      ),
    },
    {
      key: 'email',
      header: 'Email',
    },
  ];

  if (loading) return <Loading />;

  return (
    <div className="animate-fade-in">
      {error && <ErrorBanner message={error} />}
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-top">
          <h1>Email Campaigns</h1>
          <button id="btn-create-campaign-trigger" className="btn btn-primary" onClick={openWizard}>
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            New Campaign
          </button>
        </div>
        <p>Configure automated outreach cadences, map target buyer profiles, and launch transmission schedules.</p>
      </div>

      {/* Campaigns Listing */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        {campaigns.length > 0 ? (
          campaigns.map((camp) => {
            const template = templates.find((t) => t.id === camp.templateId);
            const statusClass =
              camp.status === 'completed'
                ? 'status-success'
                : camp.status === 'sending'
                ? 'status-info'
                : camp.status === 'scheduled'
                ? 'status-warning'
                : 'status-neutral';

            return (
              <div key={camp.id} className="card stagger-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
                  <div>
                    <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--accent-blue)' }}>
                      {camp.name}
                    </h3>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      📋 Template: <strong>{template ? template.name : 'Unknown'}</strong> | Selected Targets: <strong>{camp.contactIds.length}</strong>
                    </p>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                      Created: {new Date(camp.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                    <span className={`badge ${statusClass}`} style={{ textTransform: 'capitalize' }}>
                      {camp.status}
                    </span>
                    {(camp.status === 'sending' || camp.status === 'scheduled') && (
                      <button
                        id={`btn-run-campaign-${camp.id}`}
                        className="btn btn-secondary btn-sm"
                        onClick={() => { void handleRun(camp.id); }}
                        disabled={runningIds.has(camp.id)}
                        style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)' }}
                      >
                        {runningIds.has(camp.id) ? 'Running...' : 'Run'}
                      </button>
                    )}
                    <button
                      id={`btn-delete-campaign-${camp.id}`}
                      className="btn btn-danger btn-sm btn-icon"
                      onClick={() => { void handleDeleteCampaign(camp.id); }}
                      title="Delete Campaign"
                    >
                      <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                    </button>
                  </div>
                </div>

                {/* Campaign Progress / Stats Summary */}
                {camp.status !== 'scheduled' && (
                  <div style={{ marginTop: 'var(--space-lg)', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--space-md)', background: 'var(--bg-secondary)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Sent</div>
                      <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-primary)' }}>{camp.stats.sent}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Delivered</div>
                      <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--accent-blue)' }}>{camp.stats.delivered}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Opened</div>
                      <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--accent-cyan)' }}>{camp.stats.opened}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Clicked</div>
                      <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--accent-emerald)' }}>{camp.stats.clicked}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Replied</div>
                      <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--accent-amber)' }}>{camp.stats.replied}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="empty-state card">
            <svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            <h3>No campaigns configured</h3>
            <p>Assemble custom content variables and schedule automated delivery arrays to trigger prospects.</p>
          </div>
        )}
      </div>

      {/* Campaign Creation Multi-Step Wizard Modal */}
      <Modal
        id="wizard-modal"
        isOpen={showWizard}
        onClose={closeWizard}
        title={`New Campaign Wizard (Step ${String(wizard.step)} of 5)`}
        footer={
          <>
            {wizard.step > 1 && (
              <button id="btn-wizard-prev" className="btn btn-secondary" onClick={prevStep}>Back</button>
            )}
            {wizard.step < 5 ? (
              <button id="btn-wizard-next" className="btn btn-primary" onClick={nextStep}>Next</button>
            ) : (
              <button id="btn-wizard-launch" className="btn btn-primary" onClick={() => { void handleLaunchCampaign(); }}>Launch Campaign</button>
            )}
          </>
        }
      >
        {/* STEP 1: Campaign Metadata */}
        {wizard.step === 1 && (
          <div className="animate-fade-in">
            <FormField id="input-wizard-name" label="Campaign Name" required>
              <input
                type="text"
                placeholder="e.g. EU Textile Buyers Launch"
                value={wizard.name}
                onChange={(e) => setWizard({ ...wizard, name: e.target.value })}
              />
            </FormField>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-xs)' }}>
              Choose a descriptive name to organize your outreach analytics (e.g. including product or market sector).
            </p>
          </div>
        )}

        {/* STEP 2: Template Selection */}
        {wizard.step === 2 && (
          <div className="animate-fade-in">
            <FormField id="select-wizard-template" label="Select Email Template" required>
              <select
                value={wizard.templateId}
                onChange={(e) => setWizard({ ...wizard, templateId: e.target.value })}
              >
                <option value="">-- Choose template --</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} (Tokens: {t.variables.length})</option>
                ))}
              </select>
            </FormField>
          </div>
        )}

        {/* STEP 3: Contacts Selection */}
        {wizard.step === 3 && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
              <input
                id="input-wizard-contacts-search"
                className="form-input"
                placeholder="Search targets..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                style={{ flex: 2 }}
              />
              <select
                id="select-wizard-tag-filter"
                className="form-select"
                value={contactTagFilter}
                onChange={(e) => setContactTagFilter(e.target.value)}
                style={{ flex: 1 }}
              >
                <option value="all">All Tags</option>
                {allContactTags.map((tag) => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>

            <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
              <DataTable
                id="wizard-contacts-table"
                columns={contactColumns}
                data={filteredWizardContacts}
                keyExtractor={(item) => item.id}
                selectedIds={wizard.contactIds}
                onSelectChange={handleToggleContact}
                onSelectAllChange={handleSelectAllWizardContacts}
              />
            </div>
            <div style={{ marginTop: 'var(--space-sm)', fontSize: 'var(--font-size-xs)', textAlign: 'right', fontWeight: 'var(--font-weight-medium)' }}>
              Selected Contacts: {wizard.contactIds.length}
            </div>
          </div>
        )}

        {/* STEP 4: Sending Cadence Settings */}
        {wizard.step === 4 && (
          <div className="animate-fade-in">
            <FormField id="select-wizard-send-type" label="Sending Strategy">
              <select
                value={wizard.scheduleType}
                onChange={(e) => setWizard({ ...wizard, scheduleType: e.target.value as 'immediate' | 'scheduled' | 'drip' })}
              >
                <option value="immediate">Send Immediately (Demo Mode Runs Instantly)</option>
                <option value="scheduled">Schedule Date (Cron-Based Delayed delivery)</option>
                <option value="drip">Drip Delivery Array (Throttled rate)</option>
              </select>
            </FormField>

            {wizard.scheduleType === 'scheduled' && (
              <FormField id="input-wizard-schedule-date" label="Scheduled Start Date" containerClassName="animate-slide-down" required>
                <input
                  type="date"
                  value={wizard.scheduledAt}
                  onChange={(e) => setWizard({ ...wizard, scheduledAt: e.target.value })}
                />
              </FormField>
            )}

            {wizard.scheduleType === 'drip' && (
              <FormField id="input-wizard-drip-rate" label="Sends Per Hour" containerClassName="animate-slide-down">
                <input
                  type="number"
                  min={1}
                  value={wizard.sendsPerHour}
                  onChange={(e) => setWizard({ ...wizard, sendsPerHour: parseInt(e.target.value) || 50 })}
                />
              </FormField>
            )}
          </div>
        )}

        {/* STEP 5: Final Review */}
        {wizard.step === 5 && (
          <div className="animate-fade-in">
            <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--accent-blue)', marginBottom: 'var(--space-md)' }}>
              Confirm Campaign Configuration
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', background: 'var(--bg-secondary)', padding: 'var(--space-lg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div>
                <span style={{ color: 'var(--text-tertiary)' }}>Campaign Name:</span>
                <strong style={{ display: 'block', color: 'var(--text-primary)' }}>{wizard.name}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-tertiary)' }}>Template:</span>
                <strong style={{ display: 'block', color: 'var(--text-primary)' }}>
                  {templates.find((t) => t.id === wizard.templateId)?.name}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-tertiary)' }}>Recipient Count:</span>
                <strong style={{ display: 'block', color: 'var(--text-primary)' }}>{wizard.contactIds.length} targets</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-tertiary)' }}>Schedule Settings:</span>
                <strong style={{ display: 'block', color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                  {wizard.scheduleType} {wizard.scheduleType === 'scheduled' ? `on ${wizard.scheduledAt}` : ''} {wizard.scheduleType === 'drip' ? `at ${String(wizard.sendsPerHour)} emails/hr` : ''}
                </strong>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
