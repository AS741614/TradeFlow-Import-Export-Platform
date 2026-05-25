'use client';

import { useState } from 'react';
import { getItems, STORAGE_KEYS } from '@/lib/storage';
import { formatNumber, formatDate, getStatusColor, titleCase } from '@/lib/utils';
import type { OutreachContact, EmailTemplate, Campaign } from '@/lib/types';

// ---- Inline SVG Icons ----

function ContactsIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function TemplateIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function CampaignIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 010 14.14" />
      <path d="M15.54 8.46a5 5 0 010 7.07" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" style={{ width: 16, height: 16 }}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function TrackingIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

// ---- Metric Data Shape ----

interface MetricData {
  label: string;
  value: string;
  color: 'blue' | 'emerald' | 'amber' | 'cyan';
  icon: React.ReactNode;
}

// ---- Quick Action Shape ----

interface QuickAction {
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color: string;
}

export default function OutreachDashboardPage() {
  const [metrics] = useState<MetricData[]>(() => {
    const contacts = getItems<OutreachContact>(STORAGE_KEYS.OUTREACH_CONTACTS);
    const templates = getItems<EmailTemplate>(STORAGE_KEYS.EMAIL_TEMPLATES);
    const allCampaigns = getItems<Campaign>(STORAGE_KEYS.CAMPAIGNS);

    const activeCampaigns = allCampaigns.filter(
      (c) => c.status === 'sending' || c.status === 'scheduled'
    );
    const totalSent = allCampaigns.reduce((sum, c) => sum + c.stats.sent, 0);

    return [
      {
        label: 'Total Contacts',
        value: formatNumber(contacts.length),
        color: 'blue',
        icon: <ContactsIcon />,
      },
      {
        label: 'Templates',
        value: formatNumber(templates.length),
        color: 'emerald',
        icon: <TemplateIcon />,
      },
      {
        label: 'Active Campaigns',
        value: formatNumber(activeCampaigns.length),
        color: 'amber',
        icon: <CampaignIcon />,
      },
      {
        label: 'Emails Sent',
        value: formatNumber(totalSent),
        color: 'cyan',
        icon: <EmailIcon />,
      },
    ];
  });
  const [campaigns] = useState<Campaign[]>(() => {
    const allCampaigns = getItems<Campaign>(STORAGE_KEYS.CAMPAIGNS);
    return allCampaigns.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });

  const quickActions: QuickAction[] = [
    {
      label: 'Import Contacts',
      description: 'Upload CSV or JSON files with your contact list',
      href: '/outreach/contacts',
      icon: <ContactsIcon />,
      color: 'var(--accent-blue)',
    },
    {
      label: 'Build Templates',
      description: 'Create and manage reusable email templates',
      href: '/outreach/templates',
      icon: <TemplateIcon />,
      color: 'var(--accent-emerald)',
    },
    {
      label: 'Launch Campaign',
      description: 'Set up a new outreach campaign with targeting',
      href: '/outreach/campaigns',
      icon: <CampaignIcon />,
      color: 'var(--accent-amber)',
    },
    {
      label: 'View Tracking',
      description: 'Analyze open rates, clicks, and engagement',
      href: '/outreach/tracking',
      icon: <TrackingIcon />,
      color: 'var(--accent-cyan)',
    },
  ];



  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-top">
          <h1>Email Outreach</h1>
        </div>
        <p>Manage contacts, templates, and campaigns for your outreach efforts.</p>
      </div>

      {/* Metric Cards */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-xl)' }}>
        {metrics.map((metric) => (
          <div key={metric.label} className={`metric-card ${metric.color} stagger-item`}>
            <div className={`metric-card-icon ${metric.color}`}>{metric.icon}</div>
            <div className="metric-card-content">
              <div className="metric-card-label">{metric.label}</div>
              <div className="metric-card-value">{metric.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginBottom: 'var(--space-xl)' }}>
        {/* Recent Campaigns */}
        <div className="card">
          <h3
            style={{
              fontSize: 'var(--font-size-md)',
              fontWeight: 'var(--font-weight-semibold)',
              marginBottom: 'var(--space-lg)',
            }}
          >
            Recent Campaigns
          </h3>
          {campaigns.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {campaigns.slice(0, 5).map((campaign) => (
                <div
                  key={campaign.id}
                  className="stagger-item"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--space-md)',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 'var(--font-weight-medium)',
                      }}
                    >
                      {campaign.name}
                    </div>
                    <div
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--text-tertiary)',
                        marginTop: '2px',
                      }}
                    >
                      {formatDate(campaign.createdAt)} · {campaign.contactIds.length} contacts
                    </div>
                  </div>
                  <span className={`badge ${getStatusColor(campaign.status)}`}>
                    {titleCase(campaign.status)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
              <CampaignIcon />
              <h3>No Campaigns Yet</h3>
              <p>Create your first outreach campaign to start engaging with potential partners.</p>
              <a href="/outreach/campaigns" className="btn btn-primary" id="outreach-cta-new-campaign">
                Create Campaign
              </a>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h3
            style={{
              fontSize: 'var(--font-size-md)',
              fontWeight: 'var(--font-weight-semibold)',
              marginBottom: 'var(--space-lg)',
            }}
          >
            Quick Actions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {quickActions.map((action) => (
              <a
                key={action.label}
                href={action.href}
                id={`outreach-action-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
                className="stagger-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-md)',
                  padding: 'var(--space-md)',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  textDecoration: 'none',
                  transition: 'all 200ms ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-accent)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 'var(--radius-md)',
                    background: `${action.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: action.color,
                  }}
                >
                  <div style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {action.icon}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                    }}
                  >
                    {action.label}
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--text-tertiary)',
                      marginTop: '2px',
                    }}
                  >
                    {action.description}
                  </div>
                </div>
                <ArrowRightIcon />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
