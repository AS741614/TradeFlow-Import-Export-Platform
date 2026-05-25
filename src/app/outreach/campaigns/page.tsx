'use client';

import { useState } from 'react';
import { getItems, addItem, removeItem, STORAGE_KEYS } from '@/lib/storage';
import { generateId, nowISO } from '@/lib/utils';
import { runCampaignSimulation } from '@/lib/email';
import type { Campaign, EmailTemplate, OutreachContact } from '@/lib/types';

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
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => getItems<Campaign>(STORAGE_KEYS.CAMPAIGNS));
  const [templates] = useState<EmailTemplate[]>(() => getItems<EmailTemplate>(STORAGE_KEYS.EMAIL_TEMPLATES));
  const [contacts] = useState<OutreachContact[]>(() => getItems<OutreachContact>(STORAGE_KEYS.OUTREACH_CONTACTS));

  // Wizard state
  const [showWizard, setShowWizard] = useState(false);
  const [wizard, setWizard] = useState(INITIAL_WIZARD);
  const [contactSearch, setContactSearch] = useState('');
  const [contactTagFilter, setContactTagFilter] = useState('all');

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
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] ?? '', // strict-ts-deferred: assert at constants source in later prompt
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

  const handleLaunchCampaign = () => {
    const selectedTemplate = templates.find((t) => t.id === wizard.templateId);
    if (!selectedTemplate) return;

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

    const updatedCampaigns = addItem<Campaign>(STORAGE_KEYS.CAMPAIGNS, newCampaign);
    setCampaigns(updatedCampaigns);
    closeWizard();

    // Trigger simulation send if set to immediate
    if (wizard.scheduleType === 'immediate') {
      runCampaignSimulation(newCampaign.id);
      // Wait and reload after simulation completes to fetch fresh simulation stats
      setTimeout(() => {
        setCampaigns(getItems<Campaign>(STORAGE_KEYS.CAMPAIGNS));
      }, 2000);
    }
  };

  const handleDeleteCampaign = (id: string) => {
    if (confirm('Are you sure you want to delete this campaign?')) {
      const updated = removeItem<Campaign>(STORAGE_KEYS.CAMPAIGNS, id);
      setCampaigns(updated);
    }
  };



  return (
    <div className="animate-fade-in">
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
                    <button
                      id={`btn-delete-campaign-${camp.id}`}
                      className="btn btn-danger btn-sm btn-icon"
                      onClick={() => handleDeleteCampaign(camp.id)}
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
      {showWizard && (
        <div className="modal-overlay" onClick={closeWizard}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Campaign Wizard (Step {wizard.step} of 5)</h2>
              <button id="btn-close-wizard" className="btn btn-ghost btn-icon btn-sm" onClick={closeWizard}>
                <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            <div className="modal-body">
              
              {/* STEP 1: Campaign Metadata */}
              {wizard.step === 1 && (
                <div className="animate-fade-in">
                  <div className="form-group">
                    <label className="form-label" htmlFor="input-wizard-name">Campaign Name *</label>
                    <input
                      id="input-wizard-name"
                      className="form-input"
                      type="text"
                      placeholder="e.g. EU Textile Buyers Launch"
                      value={wizard.name}
                      onChange={(e) => setWizard({ ...wizard, name: e.target.value })}
                    />
                  </div>
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                    Choose a descriptive name to organize your outreach analytics (e.g. including product or market sector).
                  </p>
                </div>
              )}

              {/* STEP 2: Template Selection */}
              {wizard.step === 2 && (
                <div className="animate-fade-in">
                  <div className="form-group">
                    <label className="form-label" htmlFor="select-wizard-template">Select Email Template *</label>
                    <select
                      id="select-wizard-template"
                      className="form-select"
                      value={wizard.templateId}
                      onChange={(e) => setWizard({ ...wizard, templateId: e.target.value })}
                    >
                      <option value="">-- Choose template --</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>{t.name} (Tokens: {t.variables.length})</option>
                      ))}
                    </select>
                  </div>
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

                  <div className="data-table-wrapper" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ width: 40 }}>
                            <input
                              id="checkbox-wizard-select-all"
                              type="checkbox"
                              checked={filteredWizardContacts.length > 0 && filteredWizardContacts.every((c) => wizard.contactIds.includes(c.id))}
                              onChange={(e) => handleSelectAllWizardContacts(e.target.checked)}
                            />
                          </th>
                          <th>Company / Target</th>
                          <th>Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredWizardContacts.map((c) => (
                          <tr key={c.id}>
                            <td>
                              <input
                                id={`checkbox-wizard-select-${c.id}`}
                                type="checkbox"
                                checked={wizard.contactIds.includes(c.id)}
                                onChange={(e) => handleToggleContact(c.id, e.target.checked)}
                              />
                            </td>
                            <td><strong>{c.company}</strong> ({c.firstName})</td>
                            <td>{c.email}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ marginTop: 'var(--space-sm)', fontSize: 'var(--font-size-xs)', textAlign: 'right', fontWeight: 'var(--font-weight-medium)' }}>
                    Selected Contacts: {wizard.contactIds.length}
                  </div>
                </div>
              )}

              {/* STEP 4: Sending Cadence Settings */}
              {wizard.step === 4 && (
                <div className="animate-fade-in">
                  <div className="form-group">
                    <label className="form-label" htmlFor="select-wizard-send-type">Sending Strategy</label>
                    <select
                      id="select-wizard-send-type"
                      className="form-select"
                      value={wizard.scheduleType}
                      onChange={(e) => setWizard({ ...wizard, scheduleType: e.target.value as 'immediate' | 'scheduled' | 'drip' })}
                    >
                      <option value="immediate">Send Immediately (Demo Mode Runs Instantly)</option>
                      <option value="scheduled">Schedule Date (Cron-Based Delayed delivery)</option>
                      <option value="drip">Drip Delivery Array (Throttled rate)</option>
                    </select>
                  </div>

                  {wizard.scheduleType === 'scheduled' && (
                    <div className="form-group animate-slide-down">
                      <label className="form-label" htmlFor="input-wizard-schedule-date">Scheduled Start Date *</label>
                      <input
                        id="input-wizard-schedule-date"
                        className="form-input"
                        type="date"
                        value={wizard.scheduledAt}
                        onChange={(e) => setWizard({ ...wizard, scheduledAt: e.target.value })}
                      />
                    </div>
                  )}

                  {wizard.scheduleType === 'drip' && (
                    <div className="form-group animate-slide-down">
                      <label className="form-label" htmlFor="input-wizard-drip-rate">Sends Per Hour</label>
                      <input
                        id="input-wizard-drip-rate"
                        className="form-input"
                        type="number"
                        min={1}
                        value={wizard.sendsPerHour}
                        onChange={(e) => setWizard({ ...wizard, sendsPerHour: parseInt(e.target.value) || 50 })}
                      />
                    </div>
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

            </div>

            <div className="modal-footer">
              {wizard.step > 1 && (
                <button id="btn-wizard-prev" className="btn btn-secondary" onClick={prevStep}>Back</button>
              )}
              {wizard.step < 5 ? (
                <button id="btn-wizard-next" className="btn btn-primary" onClick={nextStep}>Next</button>
              ) : (
                <button id="btn-wizard-launch" className="btn btn-primary" onClick={handleLaunchCampaign}>Launch Campaign</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
