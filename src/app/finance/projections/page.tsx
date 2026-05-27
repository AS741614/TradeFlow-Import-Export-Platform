'use client';

import { useState, useEffect } from 'react';
import { getItems, addItem, updateItem, removeItem } from '@/lib/storage';
import { formatCurrency, generateId } from '@/lib/utils';
import type { FinancialProjection } from '@/lib/types';
import { StorageError } from '@/lib/api-client';
import Loading from '@/components/Loading';
import ErrorBanner from '@/components/ErrorBanner';

// ---- Month labels for dropdown ----
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const currentYear = new Date().getFullYear();

export default function ProjectionsPage() {
  const [projections, setProjections] = useState<FinancialProjection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formMonth, setFormMonth] = useState(`${MONTHS[0] ?? ''} ${String(currentYear)}`);
  const [formRevenue, setFormRevenue] = useState('');
  const [formExpenses, setFormExpenses] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await getItems<FinancialProjection>('financial-projections');
        if (!cancelled) setProjections(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof StorageError ? err.message : 'Failed to load projections');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setFormMonth(`${MONTHS[0] ?? ''} ${String(currentYear)}`);
    setFormRevenue('');
    setFormExpenses('');
  };

  const handleSave = async () => {
    const revenue = parseFloat(formRevenue) || 0;
    const expenses = parseFloat(formExpenses) || 0;
    const profit = revenue - expenses;

    setLoading(true);
    setError(null);
    try {
      if (editingId) {
        // Update existing
        const fresh = await updateItem<FinancialProjection>('financial-projections', editingId, {
          month: formMonth,
          revenue,
          expenses,
          profit,
        });
        setProjections(fresh);
      } else {
        // Add new
        const newItem: FinancialProjection = {
          id: generateId(),
          month: formMonth,
          revenue,
          expenses,
          profit,
          currency: 'USD',
        };
        const fresh = await addItem<FinancialProjection>('financial-projections', newItem);
        setProjections(fresh);
      }
      resetForm();
    } catch (err) {
      setError(err instanceof StorageError ? err.message : 'Failed to save projection');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: FinancialProjection) => {
    setEditingId(item.id);
    setFormMonth(item.month);
    setFormRevenue(item.revenue.toString());
    setFormExpenses(item.expenses.toString());
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const fresh = await removeItem<FinancialProjection>('financial-projections', id);
      setProjections(fresh);
      if (editingId === id) resetForm();
    } catch (err) {
      setError(err instanceof StorageError ? err.message : 'Failed to delete projection');
    } finally {
      setLoading(false);
    }
  };

  // ---- Summary calculations ----
  const totalRevenue = projections.reduce((s, p) => s + p.revenue, 0);
  const totalExpenses = projections.reduce((s, p) => s + p.expenses, 0);
  const totalProfit = totalRevenue - totalExpenses;

  const breakEvenMonth = (() => {
    let cumulative = 0;
    for (const p of projections) {
      cumulative += p.profit;
      if (cumulative >= 0 && p.profit >= 0) return p.month;
    }
    return 'N/A';
  })();

  // Max value for bar chart scaling
  const maxValue = Math.max(
    ...projections.map((p) => Math.max(p.revenue, p.expenses, Math.abs(p.profit))),
    1, // avoid 0
  );



  if (loading) return <Loading />;

  return (
    <div className="animate-fade-in">
      {error && <ErrorBanner message={error} />}
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-top">
          <h1>P&L Projections</h1>
        </div>
        <p>Plan monthly revenue, expenses and profit. Visualise your path to profitability.</p>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="metric-card emerald stagger-item" id="proj-metric-revenue">
          <div className="metric-card-icon emerald">
            <svg viewBox="0 0 24 24">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          </div>
          <div className="metric-card-content">
            <div className="metric-card-label">Total Revenue</div>
            <div className="metric-card-value">{formatCurrency(totalRevenue)}</div>
          </div>
        </div>

        <div className="metric-card red stagger-item" id="proj-metric-expenses">
          <div className="metric-card-icon red">
            <svg viewBox="0 0 24 24">
              <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
              <polyline points="17 18 23 18 23 12" />
            </svg>
          </div>
          <div className="metric-card-content">
            <div className="metric-card-label">Total Expenses</div>
            <div className="metric-card-value">{formatCurrency(totalExpenses)}</div>
          </div>
        </div>

        <div className="metric-card blue stagger-item" id="proj-metric-profit">
          <div className="metric-card-icon blue">
            <svg viewBox="0 0 24 24">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          </div>
          <div className="metric-card-content">
            <div className="metric-card-label">Total Profit</div>
            <div className="metric-card-value" style={{ color: totalProfit >= 0 ? 'var(--accent-emerald)' : 'var(--accent-red)' }}>
              {formatCurrency(totalProfit)}
            </div>
          </div>
        </div>

        <div className="metric-card amber stagger-item" id="proj-metric-breakeven">
          <div className="metric-card-icon amber">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="metric-card-content">
            <div className="metric-card-label">Break-Even Month</div>
            <div className="metric-card-value" style={{ fontSize: 'var(--font-size-lg)' }}>
              {breakEvenMonth}
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Form */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-lg)' }}>
          {editingId ? 'Edit Projection' : 'Add Monthly Projection'}
        </h3>
        <div className="form-row" style={{ alignItems: 'flex-end' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="proj-month">Month</label>
            <select
              id="proj-month"
              className="form-select"
              value={formMonth}
              onChange={(e) => setFormMonth(e.target.value)}
            >
              {MONTHS.map((m) => (
                <option key={m} value={`${m} ${String(currentYear)}`}>
                  {m} {currentYear}
                </option>
              ))}
              {MONTHS.map((m) => (
                <option key={`${m}-next`} value={`${m} ${String(currentYear + 1)}`}>
                  {m} {currentYear + 1}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="proj-revenue">Revenue ($)</label>
            <input
              id="proj-revenue"
              type="number"
              className="form-input"
              placeholder="0.00"
              min="0"
              step="0.01"
              value={formRevenue}
              onChange={(e) => setFormRevenue(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="proj-expenses">Expenses ($)</label>
            <input
              id="proj-expenses"
              type="number"
              className="form-input"
              placeholder="0.00"
              min="0"
              step="0.01"
              value={formExpenses}
              onChange={(e) => setFormExpenses(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <button id="proj-save-btn" className="btn btn-primary" onClick={() => { void handleSave(); }}>
              {editingId ? 'Update' : 'Add'}
            </button>
            {editingId && (
              <button id="proj-cancel-btn" className="btn btn-secondary" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Projections Data Table */}
      <div className="data-table-wrapper" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="data-table-header">
          <h3>Monthly Projections</h3>
          <span className="text-sm text-secondary">{projections.length} months</span>
        </div>
        {projections.length > 0 ? (
          <table className="data-table" id="proj-data-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Revenue</th>
                <th>Expenses</th>
                <th>Profit</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projections.map((p) => (
                <tr key={p.id} className="stagger-item">
                  <td style={{ fontWeight: 'var(--font-weight-medium)' }}>{p.month}</td>
                  <td style={{ color: 'var(--accent-emerald)' }}>{formatCurrency(p.revenue)}</td>
                  <td style={{ color: 'var(--accent-red)' }}>{formatCurrency(p.expenses)}</td>
                  <td
                    style={{
                      fontWeight: 'var(--font-weight-semibold)',
                      color: p.profit >= 0 ? 'var(--accent-emerald)' : 'var(--accent-red)',
                    }}
                  >
                    {formatCurrency(p.profit)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                      <button
                        id={`proj-edit-${p.id}`}
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleEdit(p)}
                      >
                        <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }}>
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        id={`proj-delete-${p.id}`}
                        className="btn btn-danger btn-sm"
                        onClick={() => { void handleDelete(p.id); }}
                      >
                        <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }}>
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="data-table-empty">
            <svg viewBox="0 0 24 24">
              <path d="M18 20V10M12 20V4M6 20v-6" />
            </svg>
            <p>No projections yet. Add your first month above.</p>
          </div>
        )}
      </div>

      {/* Bar Chart Visualization */}
      {projections.length > 0 && (
        <div className="card">
          <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-lg)' }}>
            Visual Breakdown
          </h3>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 'var(--space-lg)', marginBottom: 'var(--space-lg)', fontSize: 'var(--font-size-xs)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--accent-emerald)' }} />
              <span className="text-secondary">Revenue</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--accent-red)' }} />
              <span className="text-secondary">Expenses</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--accent-blue)' }} />
              <span className="text-secondary">Profit</span>
            </div>
          </div>

          {/* Bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            {projections.map((p) => {
              const revWidth = maxValue > 0 ? (p.revenue / maxValue) * 100 : 0;
              const expWidth = maxValue > 0 ? (p.expenses / maxValue) * 100 : 0;
              const profitWidth = maxValue > 0 ? (Math.abs(p.profit) / maxValue) * 100 : 0;
              return (
                <div key={p.id} className="stagger-item">
                  <div
                    className="text-sm font-medium"
                    style={{ marginBottom: 'var(--space-xs)' }}
                  >
                    {p.month}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {/* Revenue bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      <div
                        style={{
                          height: 20,
                          width: `${String(Math.max(revWidth, 2))}%`,
                          background: 'var(--accent-emerald)',
                          borderRadius: 'var(--radius-sm)',
                          transition: 'width 500ms ease',
                          minWidth: 4,
                        }}
                      />
                      <span className="text-xs text-secondary">{formatCurrency(p.revenue)}</span>
                    </div>
                    {/* Expenses bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      <div
                        style={{
                          height: 20,
                          width: `${String(Math.max(expWidth, 2))}%`,
                          background: 'var(--accent-red)',
                          borderRadius: 'var(--radius-sm)',
                          transition: 'width 500ms ease',
                          minWidth: 4,
                        }}
                      />
                      <span className="text-xs text-secondary">{formatCurrency(p.expenses)}</span>
                    </div>
                    {/* Profit bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      <div
                        style={{
                          height: 20,
                          width: `${String(Math.max(profitWidth, 2))}%`,
                          background: p.profit >= 0 ? 'var(--accent-blue)' : 'var(--accent-amber)',
                          borderRadius: 'var(--radius-sm)',
                          transition: 'width 500ms ease',
                          minWidth: 4,
                          opacity: 0.85,
                        }}
                      />
                      <span className="text-xs text-secondary">{formatCurrency(p.profit)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
