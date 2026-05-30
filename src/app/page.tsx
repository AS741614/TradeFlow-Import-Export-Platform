'use client';

import { useState, useEffect } from 'react';
import { getItems } from '@/lib/storage';
import { formatCurrency, formatNumber, formatDate } from '@/lib/utils';
import type { Task, ActivityLog } from '@/lib/types';
import { StorageError } from '@/lib/api-client';
import Loading from '@/components/Loading';
import ErrorBanner from '@/components/ErrorBanner';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';

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
  const [recentLogs, setRecentLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        // 1. Fetch aggregated stats from server (this auto-seeds if fresh)
        const statsRes = await fetch('/api/dashboard/stats');
        if (!statsRes.ok) {
          throw new Error('Failed to load dashboard statistics');
        }
        interface DashboardStats {
          contactsCount: number;
          productsCount: number;
          shipmentsCount: number;
          invoicesCount: number;
          tasksCount: number;
          campaignsCount: number;
          activeProductsCount: number;
          openInvoicesCount: number;
          pendingTasksCount: number;
          inTransitShipmentsCount: number;
          totalCampaignsSent: number;
        }
        const statsData = (await statsRes.json()) as { data: DashboardStats };
        const stats = statsData.data;

        // 2. Fetch tasks array only for the "Priority Tasks" section if tasks exist
        let dashboardTasks: Task[] = [];
        if (stats.tasksCount > 0) {
          dashboardTasks = await getItems<Task>('tasks');
        }

        // 3. Fetch recent activity logs (limit 10)
        let logs: ActivityLog[] = [];
        try {
          const logsRes = await fetch('/api/activity-log?limit=10');
          if (logsRes.ok) {
            const logsData = (await logsRes.json()) as { data: ActivityLog[] };
            logs = logsData.data;
          }
        } catch (err) {
          console.error('Failed to load recent activity logs:', err);
        }

        if (!cancelled) {
          const completedTasks = stats.tasksCount - stats.pendingTasksCount;
          const lowStock = stats.productsCount - stats.activeProductsCount;

          setMetrics([
            { label: 'Total Products', value: formatNumber(stats.productsCount), color: 'blue', icon: <MetricIcon name="products" /> },
            { label: 'Active Shipments', value: formatNumber(stats.inTransitShipmentsCount), color: 'cyan', icon: <MetricIcon name="shipments" /> },
            { label: 'Pending Invoices', value: formatNumber(stats.openInvoicesCount), color: 'amber', icon: <MetricIcon name="invoices" /> },
            { label: 'Total Contacts', value: formatNumber(stats.contactsCount), color: 'purple', icon: <MetricIcon name="contacts" /> },
            { label: 'Tasks Completed', value: `${String(completedTasks)}/${String(stats.tasksCount)}`, color: 'emerald', icon: <MetricIcon name="tasks" /> },
            { label: 'Low Stock Alerts', value: formatNumber(lowStock), color: 'red', icon: <MetricIcon name="alert" /> },
            { label: 'Emails Sent', value: formatNumber(stats.totalCampaignsSent), color: 'blue', icon: <MetricIcon name="email" /> },
            { label: 'Revenue (Est.)', value: formatCurrency(0), color: 'emerald', icon: <MetricIcon name="revenue" /> },
          ]);

          setUrgentTasks(dashboardTasks.filter(t => t.priority === 'urgent' || t.priority === 'high').slice(0, 5));
          setRecentLogs(logs);
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

  function formatLogAction(log: ActivityLog) {
    const entity = log.entityType.replace(/-/, ' ');
    const action = log.action.replace(/_/, ' ');
    return `${action.charAt(0).toUpperCase() + action.slice(1)} ${entity}`;
  }

  if (loading) return <Loading />;

  return (
    <div className="animate-fade-in">
      {error && <ErrorBanner message={error} />}
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-top">
          <h1>Dashboard</h1>
          <p className="text-secondary text-sm">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <p>Welcome to TradeFlow — your import/export business command center.</p>
      </div>

      {/* Metric Cards */}
      <div className="grid-4">
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

      {/* Three-column layout: Recent activity + Quick actions + Priority Tasks */}
      <div className="grid-3">
        {/* Urgent Tasks */}
        <Card header={<h3 className="text-md font-semibold">🔥 Priority Tasks</h3>}>
          {urgentTasks.length > 0 ? (
            <div className="stack-2">
              {urgentTasks.map((task) => (
                <div key={task.id} className="priority-task-item stagger-item">
                  <div>
                    <div className="text-sm font-medium">
                      {task.title}
                    </div>
                    <div className="text-xs text-tertiary priority-task-category">
                      {task.category}
                    </div>
                  </div>
                  <Badge variant={task.priority === 'urgent' ? 'danger' : 'warning'}>
                    {task.priority}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-tertiary">
              No urgent tasks. Looking good! ✨
            </p>
          )}
        </Card>

        {/* Quick Actions */}
        <Card header={<h3 className="text-md font-semibold">⚡ Quick Actions</h3>}>
          <div className="quick-actions-grid">
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
              <Link
                key={action.label}
                href={action.href}
                id={`quick-action-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
                className="quick-action-button stagger-item"
              >
                <span>{action.icon}</span>
                <span>{action.label}</span>
              </Link>
            ))}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card header={<h3 className="text-md font-semibold">⏳ Recent Activity</h3>}>
          {recentLogs.length > 0 ? (
            <div className="activity-timeline">
              {recentLogs.map((log) => (
                <div key={log.id} className="activity-item stagger-item">
                  <div className="activity-icon">
                    {log.entityType === 'products' && '📦'}
                    {log.entityType === 'shipments' && '🚢'}
                    {log.entityType === 'invoices' && '📄'}
                    {log.entityType === 'contacts' && '👤'}
                    {log.entityType === 'campaigns' && '✉️'}
                    {log.entityType === 'tasks' && '📋'}
                    {!['products', 'shipments', 'invoices', 'contacts', 'campaigns', 'tasks'].includes(log.entityType) && '⚙️'}
                  </div>
                  <div className="activity-details">
                    <div className="activity-action">
                      {formatLogAction(log)}
                    </div>
                    <div className="activity-time">
                      {formatDate(log.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-tertiary">
              No recent activity. Perform some actions to see them logged! ⚙️
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
