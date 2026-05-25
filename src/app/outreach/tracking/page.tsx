'use client';

import { useState } from 'react';
import { getItems, STORAGE_KEYS } from '@/lib/storage';
import { formatNumber, calcPercentage } from '@/lib/utils';
import type { Campaign } from '@/lib/types';

export default function OutreachTrackingPage() {
  const [campaigns] = useState<Campaign[]>(() => getItems<Campaign>(STORAGE_KEYS.CAMPAIGNS));
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(() => {
    const stored = getItems<Campaign>(STORAGE_KEYS.CAMPAIGNS);
    return stored[0]?.id ?? '';
  });

  const activeCampaign = campaigns.find((c) => c.id === selectedCampaignId);



  // Funnel calculations based on selected campaign stats
  const stats = activeCampaign?.stats ?? {
    total: 0,
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    replied: 0,
    bounced: 0,
    failed: 0,
  };

  const deliveryRate = calcPercentage(stats.delivered, stats.sent || 1);
  const openRate = calcPercentage(stats.opened, stats.delivered || 1);
  const clickRate = calcPercentage(stats.clicked, stats.opened || 1);
  const replyRate = calcPercentage(stats.replied, stats.clicked || 1);
  const bounceRate = calcPercentage(stats.bounced, stats.sent || 1);

  // Set proportional widths for funnel bars relative to Sent (which is 100%)
  const sentWidth = 100;
  const openedWidth = stats.sent ? (stats.opened / stats.sent) * 100 : 0;
  const clickedWidth = stats.sent ? (stats.clicked / stats.sent) * 100 : 0;
  const repliedWidth = stats.sent ? (stats.replied / stats.sent) * 100 : 0;

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-top">
          <h1>Outreach Tracking & Analytics</h1>
          {campaigns.length > 0 && (
            <select
              id="select-tracking-campaign-picker"
              className="form-select"
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              style={{ width: '280px' }}
            >
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.status})
                </option>
              ))}
            </select>
          )}
        </div>
        <p>Analyze prospect conversion rates, delivery statistics, and outreach funnel progression.</p>
      </div>

      {activeCampaign ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
          {/* Tracking metric cards */}
          <div className="grid-3" style={{ gap: 'var(--space-lg)' }}>
            
            <div className="metric-card blue stagger-item">
              <div className="metric-card-content">
                <div className="metric-card-label">Emails Transmitted</div>
                <div className="metric-card-value">{formatNumber(stats.sent)}</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Delivery Rate: <strong>{deliveryRate}%</strong>
                </div>
              </div>
            </div>

            <div className="metric-card cyan stagger-item">
              <div className="metric-card-content">
                <div className="metric-card-label">Opens Logged</div>
                <div className="metric-card-value">{formatNumber(stats.opened)}</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Open Rate: <strong>{openRate}%</strong>
                </div>
              </div>
            </div>

            <div className="metric-card emerald stagger-item">
              <div className="metric-card-content">
                <div className="metric-card-label">Click-through Actions</div>
                <div className="metric-card-value">{formatNumber(stats.clicked)}</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Click Rate: <strong>{clickRate}%</strong>
                </div>
              </div>
            </div>

            <div className="metric-card amber stagger-item">
              <div className="metric-card-content">
                <div className="metric-card-label">Response Replies</div>
                <div className="metric-card-value">{formatNumber(stats.replied)}</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Reply Rate: <strong>{replyRate}%</strong>
                </div>
              </div>
            </div>

            <div className="metric-card red stagger-item">
              <div className="metric-card-content">
                <div className="metric-card-label">Bounced Emails</div>
                <div className="metric-card-value">{formatNumber(stats.bounced)}</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Bounce Rate: <strong>{bounceRate}%</strong>
                </div>
              </div>
            </div>

            <div className="metric-card purple stagger-item">
              <div className="metric-card-content">
                <div className="metric-card-label">Campaign Scope</div>
                <div className="metric-card-value">{formatNumber(stats.total)}</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Total Targets Configured
                </div>
              </div>
            </div>

          </div>

          {/* Double Column: Funnel Chart & Detailed rates */}
          <div className="grid-2" style={{ gridTemplateColumns: '3fr 2fr', gap: 'var(--space-xl)' }}>
            
            {/* Funnel Visualization */}
            <div className="card">
              <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-xl)' }}>
                🏆 Outreach Funnel Chart
              </h3>
              
              <div className="funnel">
                
                <div className="funnel-step stagger-item">
                  <div className="funnel-label">Transmitted</div>
                  <div className="funnel-bar" style={{ width: `${String(sentWidth)}%`, background: 'var(--accent-blue)' }}>
                    {stats.sent} Emails ({String(sentWidth)}%)
                  </div>
                </div>

                <div className="funnel-step stagger-item" style={{ animationDelay: '50ms' }}>
                  <div className="funnel-label">Opened</div>
                  <div className="funnel-bar" style={{ width: `${String(openedWidth)}%`, background: 'var(--accent-cyan)' }}>
                    {stats.opened} ({Math.round(openedWidth)}%)
                  </div>
                </div>

                <div className="funnel-step stagger-item" style={{ animationDelay: '100ms' }}>
                  <div className="funnel-label">Clicked Link</div>
                  <div className="funnel-bar" style={{ width: `${String(clickedWidth)}%`, background: 'var(--accent-emerald)' }}>
                    {stats.clicked} ({Math.round(clickedWidth)}%)
                  </div>
                </div>

                <div className="funnel-step stagger-item" style={{ animationDelay: '150ms' }}>
                  <div className="funnel-label">Replied</div>
                  <div className="funnel-bar" style={{ width: `${String(repliedWidth)}%`, background: 'var(--accent-amber)' }}>
                    {stats.replied} ({Math.round(repliedWidth)}%)
                  </div>
                </div>

              </div>
            </div>

            {/* Campaign analytics metrics cards */}
            <div className="card">
              <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-md)' }}>
                🎯 Performance Overview
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)', marginBottom: '4px' }}>
                    <span>In-Box Open Ratio</span>
                    <strong>{openRate}%</strong>
                  </div>
                  <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${String(openRate)}%`, background: 'var(--accent-cyan)' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)', marginBottom: '4px' }}>
                    <span>Click-Through Ratio (CTR)</span>
                    <strong>{clickRate}%</strong>
                  </div>
                  <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${String(clickRate)}%`, background: 'var(--accent-emerald)' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)', marginBottom: '4px' }}>
                    <span>Interest / Response Ratio</span>
                    <strong>{replyRate}%</strong>
                  </div>
                  <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${String(replyRate)}%`, background: 'var(--accent-amber)' }} />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 'var(--space-lg)', padding: 'var(--space-md)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                💡 <strong>Optimization Tip:</strong> If your open ratio is below 30%, try refining your subject line structure or timing your campaigns differently for target countries.
              </div>
            </div>

          </div>
        </div>
      ) : (
        <div className="empty-state card">
          <svg viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
          <h3>No campaign selected</h3>
          <p>Please select an active email outreach campaign from the top bar to visualize tracking stats.</p>
        </div>
      )}
    </div>
  );
}
