'use client';

import { useState, useEffect } from 'react';
import { getItems, addItem } from '@/lib/storage';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { getSampleProducts, getSampleContacts, getDefaultTasks } from '@/lib/constants';
import type { Product, Contact, Task, Shipment, Invoice, Campaign } from '@/lib/types';
import { StorageError } from '@/lib/api-client';
import Loading from '@/components/Loading';
import ErrorBanner from '@/components/ErrorBanner';

interface MetricData {
  label: string;
  value: string;
  color: 'blue' | 'emerald' | 'amber' | 'red' | 'purple' | 'cyan';
  icon: React.ReactNode;
}

function MetricIcon({ name }: { name: string }) {
  const icons: Record<string, React.ReactNode> = {
    products: <svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
    shipments: <svg viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
    invoices: <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    contacts: <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
    tasks: <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>,
    email: <svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
    revenue: <svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
    alert: <svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  };
  return <>{icons[name] ?? icons.products}</>;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [urgentTasks, setUrgentTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        let products = await getItems<Product>('products');
        if (products.length === 0) {
          const samples = getSampleProducts();
          const seeded: Product[] = [];
          for (const item of samples) {
            const added = await addItem<Product>('products', item);
            seeded.splice(0, seeded.length, ...added);
          }
          products = seeded;
        }

        let contacts = await getItems<Contact>('contacts');
        if (contacts.length === 0) {
          const samples = getSampleContacts();
          const seeded: Contact[] = [];
          for (const item of samples) {
            const added = await addItem<Contact>('contacts', item);
            seeded.splice(0, seeded.length, ...added);
          }
          contacts = seeded;
        }

        let tasks = await getItems<Task>('tasks');
        if (tasks.length === 0) {
          const defaults = getDefaultTasks();
          const seeded: Task[] = [];
          for (const item of defaults) {
            const added = await addItem<Task>('tasks', item);
            seeded.splice(0, seeded.length, ...added);
          }
          tasks = seeded;
        }

        const [shipments, invoices, campaigns] = await Promise.all([
          getItems<Shipment>('shipments'),
          getItems<Invoice>('invoices'),
          getItems<Campaign>('campaigns'),
        ]);

        if (!cancelled) {
          const lowStock = products.filter(p => p.status === 'low-stock' || p.status === 'out-of-stock').length;
          const activeShipments = shipments.filter(s => s.status !== 'delivered').length;
          const pendingInvoices = invoices.filter(i => i.status === 'draft' || i.status === 'sent').length;
          const completedTasks = tasks.filter(t => t.status === 'done').length;
          const totalEmailsSent = campaigns.reduce((sum, c) => sum + c.stats.sent, 0);

          setMetrics([
            { label: 'Total Products', value: formatNumber(products.length), color: 'blue', icon: <MetricIcon name="products" /> },
            { label: 'Active Shipments', value: formatNumber(activeShipments), color: 'cyan', icon: <MetricIcon name="shipments" /> },
            { label: 'Pending Invoices', value: formatNumber(pendingInvoices), color: 'amber', icon: <MetricIcon name="invoices" /> },
            { label: 'Total Contacts', value: formatNumber(contacts.length), color: 'purple', icon: <MetricIcon name="contacts" /> },
            { label: 'Tasks Completed', value: `${String(completedTasks)}/${String(tasks.length)}`, color: 'emerald', icon: <MetricIcon name="tasks" /> },
            { label: 'Low Stock Alerts', value: formatNumber(lowStock), color: 'red', icon: <MetricIcon name="alert" /> },
            { label: 'Emails Sent', value: formatNumber(totalEmailsSent), color: 'blue', icon: <MetricIcon name="email" /> },
            { label: 'Revenue (Est.)', value: formatCurrency(0), color: 'emerald', icon: <MetricIcon name="revenue" /> },
          ]);

          setUrgentTasks(tasks.filter(t => t.priority === 'urgent' || t.priority === 'high').slice(0, 5));
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof StorageError ? err.message : 'Failed to load dashboard metrics');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);



  if (loading) return <Loading />;

  return (
    <div className="animate-fade-in">
      {error && <ErrorBanner message={error} />}
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-top">
          <h1>Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <p>Welcome to TradeFlow — your import/export business command center.</p>
      </div>

      {/* Metric Cards */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-xl)' }}>
        {metrics.map((metric) => (
          <div key={metric.label} className={`metric-card ${metric.color} stagger-item`}>
            <div className={`metric-card-icon ${metric.color}`}>
              {metric.icon}
            </div>
            <div className="metric-card-content">
              <div className="metric-card-label">{metric.label}</div>
              <div className="metric-card-value">{metric.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Two-column layout: Recent activity + Quick actions */}
      <div className="grid-2">
        {/* Urgent Tasks */}
        <div className="card">
          <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-lg)' }}>
            🔥 Priority Tasks
          </h3>
          {urgentTasks.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {urgentTasks.map((task) => (
                <div key={task.id} className="stagger-item" style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--space-md)',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}>
                  <div>
                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                      {task.title}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                      {task.category}
                    </div>
                  </div>
                  <span className={`badge ${task.priority === 'urgent' ? 'status-danger' : 'status-warning'}`}>
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
              No urgent tasks. Looking good! ✨
            </p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-lg)' }}>
            ⚡ Quick Actions
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            {[
              { label: 'Add Product', href: '/operations/inventory', icon: '📦' },
              { label: 'New Shipment', href: '/operations/shipments', icon: '🚢' },
              { label: 'Create Invoice', href: '/operations/invoices', icon: '📄' },
              { label: 'Add Contact', href: '/operations/contacts', icon: '👤' },
              { label: 'Email Campaign', href: '/outreach/campaigns', icon: '✉️' },
              { label: 'Financial Report', href: '/finance', icon: '💰' },
              { label: 'Business Plan', href: '/business-plan', icon: '📊' },
              { label: 'View Projects', href: '/projects', icon: '📋' },
            ].map((action) => (
              <a
                key={action.label}
                href={action.href}
                className="stagger-item"
                id={`quick-action-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-md)',
                  padding: 'var(--space-md)',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  transition: 'all 200ms ease',
                  cursor: 'pointer',
                  textDecoration: 'none',
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
                <span style={{ fontSize: '1.25rem' }}>{action.icon}</span>
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                  {action.label}
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
