'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getItems } from '@/lib/storage';
import { formatCurrency } from '@/lib/utils';
import type { CostItem, FinancialProjection } from '@/lib/types';
import { StorageError } from '@/lib/api-client';
import Loading from '@/components/Loading';
import ErrorBanner from '@/components/ErrorBanner';
import { DataTable, Column } from '@/components/ui/DataTable';

// ---- Aggregated finance metrics ----
interface FinanceMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  avgMargin: number;
}

function computeMetrics(
  costItems: CostItem[],
  projections: FinancialProjection[],
): FinanceMetrics {
  const totalExpenses = costItems.reduce((sum, c) => sum + c.amount, 0);
  const totalRevenue = projections.reduce((sum, p) => sum + p.revenue, 0);
  const projExpenses = projections.reduce((sum, p) => sum + p.expenses, 0);
  // Combine both expense sources for net profit
  const combinedExpenses = totalExpenses + projExpenses;
  const netProfit = totalRevenue - combinedExpenses;
  const avgMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  return { totalRevenue, totalExpenses: combinedExpenses, netProfit, avgMargin };
}

export default function FinanceOverviewPage() {
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [metrics, setMetrics] = useState<FinanceMetrics>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    avgMargin: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [costs, projections] = await Promise.all([
          getItems<CostItem>('cost-items'),
          getItems<FinancialProjection>('financial-projections'),
        ]);
        if (!cancelled) {
          setCostItems(costs);
          const computed = computeMetrics(costs, projections);
          setMetrics(computed);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof StorageError ? err.message : 'Failed to load finance data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const recentCostItems = costItems.slice(-8).reverse();

  if (loading) return <Loading />;

  const columns: Column<CostItem>[] = [
    {
      key: 'description',
      header: 'Description',
    },
    {
      key: 'category',
      header: 'Category',
      render: (item) => <span className="badge status-info">{item.category}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (item) => (
        <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>
          {formatCurrency(item.amount, item.currency)}
        </span>
      ),
    },
    {
      key: 'currency',
      header: 'Currency',
    },
  ];

  return (
    <div className="animate-fade-in">
      {error && <ErrorBanner message={error} />}
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-top">
          <h1>Finance Overview</h1>
        </div>
        <p>Track revenue, expenses, profit margins and more across your trade operations.</p>
      </div>

      {/* Metric Cards */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-xl)' }}>
        {/* Total Revenue */}
        <div className="metric-card emerald stagger-item" id="finance-metric-revenue">
          <div className="metric-card-icon emerald">
            <svg viewBox="0 0 24 24">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          </div>
          <div className="metric-card-content">
            <div className="metric-card-label">Total Revenue</div>
            <div className="metric-card-value">{formatCurrency(metrics.totalRevenue)}</div>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="metric-card red stagger-item" id="finance-metric-expenses">
          <div className="metric-card-icon red">
            <svg viewBox="0 0 24 24">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          </div>
          <div className="metric-card-content">
            <div className="metric-card-label">Total Expenses</div>
            <div className="metric-card-value">{formatCurrency(metrics.totalExpenses)}</div>
          </div>
        </div>

        {/* Net Profit */}
        <div className="metric-card blue stagger-item" id="finance-metric-profit">
          <div className="metric-card-icon blue">
            <svg viewBox="0 0 24 24">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          </div>
          <div className="metric-card-content">
            <div className="metric-card-label">Net Profit</div>
            <div className="metric-card-value">{formatCurrency(metrics.netProfit)}</div>
          </div>
        </div>

        {/* Avg Margin */}
        <div className="metric-card amber stagger-item" id="finance-metric-margin">
          <div className="metric-card-icon amber">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <path d="M16 8l-8 8M8.5 8.5h.01M15.5 15.5h.01" />
            </svg>
          </div>
          <div className="metric-card-content">
            <div className="metric-card-label">Avg Margin</div>
            <div className="metric-card-value">{metrics.avgMargin.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* Recent Cost Items Table */}
      <div className="data-table-wrapper" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="data-table-header">
          <h3>Recent Cost Items</h3>
          <span className="text-sm text-secondary">{costItems.length} total</span>
        </div>
        <DataTable
          id="finance-cost-table"
          columns={columns}
          data={recentCostItems}
          keyExtractor={(item) => item.id}
          emptyState={
            <div className="data-table-empty">
              <svg viewBox="0 0 24 24">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
              <p>No cost items recorded yet.</p>
            </div>
          }
        />
      </div>

      {/* Navigation Link Cards */}
      <div className="grid-3">
        <Link
          href="/finance/margins"
          id="finance-link-margins"
          className="card card-interactive stagger-item"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
            <div
              className="metric-card-icon amber"
              style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)' }}
            >
              <svg viewBox="0 0 24 24" style={{ width: 20, height: 20 }}>
                <circle cx="12" cy="12" r="10" />
                <path d="M16 8l-8 8M8.5 8.5h.01M15.5 15.5h.01" />
              </svg>
            </div>
            <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)' }}>
              Margin Calculator
            </h3>
          </div>
          <p className="text-sm text-secondary">
            Calculate selling prices, profit margins and landed costs for your products.
          </p>
        </Link>

        <Link
          href="/finance/currency"
          id="finance-link-currency"
          className="card card-interactive stagger-item"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
            <div
              className="metric-card-icon blue"
              style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)' }}
            >
              <svg viewBox="0 0 24 24" style={{ width: 20, height: 20 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <path d="M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            </div>
            <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)' }}>
              Currency Converter
            </h3>
          </div>
          <p className="text-sm text-secondary">
            Convert amounts between currencies and compare rates across major trade currencies.
          </p>
        </Link>

        <Link
          href="/finance/projections"
          id="finance-link-projections"
          className="card card-interactive stagger-item"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
            <div
              className="metric-card-icon emerald"
              style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)' }}
            >
              <svg viewBox="0 0 24 24" style={{ width: 20, height: 20 }}>
                <path d="M18 20V10M12 20V4M6 20v-6" />
              </svg>
            </div>
            <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)' }}>
              P&L Projections
            </h3>
          </div>
          <p className="text-sm text-secondary">
            Plan monthly revenue, expenses and profit. Identify your break-even month.
          </p>
        </Link>
      </div>
    </div>
  );
}
