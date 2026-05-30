'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { FormField } from '@/components/ui/FormField';

// ---- Calculator modes ----
type CalcMode = 'margin-to-price' | 'price-to-margin';

export default function MarginsPage() {
  // Tab state
  const [mode, setMode] = useState<CalcMode>('margin-to-price');

  // Mode A: Cost + Margin % → Selling Price
  const [costA, setCostA] = useState('');
  const [marginPct, setMarginPct] = useState('');

  // Mode B: Cost + Selling Price → Margin %
  const [costB, setCostB] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');

  // Landed cost inputs
  const [purchaseCost, setPurchaseCost] = useState('');
  const [freight, setFreight] = useState('');
  const [insurance, setInsurance] = useState('');
  const [customsDutyPct, setCustomsDutyPct] = useState('');
  const [taxPct, setTaxPct] = useState('');
  const [otherCosts, setOtherCosts] = useState('');

  // ---- Computed values: Margin Calculator ----
  const computedSellingPrice = (() => {
    const cost = parseFloat(costA);
    const margin = parseFloat(marginPct);
    if (isNaN(cost) || isNaN(margin) || cost <= 0) return null;
    // Selling price = cost / (1 - margin/100)
    if (margin >= 100) return null;
    return cost / (1 - margin / 100);
  })();

  const computedProfit = computedSellingPrice !== null ? computedSellingPrice - parseFloat(costA) : null;

  const computedMarginPct = (() => {
    const cost = parseFloat(costB);
    const price = parseFloat(sellingPrice);
    if (isNaN(cost) || isNaN(price) || price <= 0) return null;
    return ((price - cost) / price) * 100;
  })();

  const computedMarkupPct = (() => {
    const cost = parseFloat(costB);
    const price = parseFloat(sellingPrice);
    if (isNaN(cost) || isNaN(price) || cost <= 0) return null;
    return ((price - cost) / cost) * 100;
  })();

  // ---- Computed values: Landed Cost ----
  const landedCost = (() => {
    const pc = parseFloat(purchaseCost) || 0;
    const fr = parseFloat(freight) || 0;
    const ins = parseFloat(insurance) || 0;
    const duty = parseFloat(customsDutyPct) || 0;
    const tax = parseFloat(taxPct) || 0;
    const other = parseFloat(otherCosts) || 0;
    const subtotal = pc + fr + ins + other;
    const dutyAmount = (pc * duty) / 100;
    const taxAmount = ((pc + dutyAmount) * tax) / 100;
    return {
      subtotal,
      dutyAmount,
      taxAmount,
      total: subtotal + dutyAmount + taxAmount,
    };
  })();

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-top">
          <h1>Margin Calculator</h1>
        </div>
        <p>Calculate selling prices, profit margins and total landed costs.</p>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          id="tab-margin-to-price"
          className={`tab ${mode === 'margin-to-price' ? 'active' : ''}`}
          onClick={() => setMode('margin-to-price')}
        >
          Cost + Margin % → Selling Price
        </button>
        <button
          id="tab-price-to-margin"
          className={`tab ${mode === 'price-to-margin' ? 'active' : ''}`}
          onClick={() => setMode('price-to-margin')}
        >
          Cost + Selling Price → Margin %
        </button>
      </div>

      <div className="grid-2" style={{ marginBottom: 'var(--space-xl)' }}>
        {/* Calculator Inputs */}
        <div className="card">
          {mode === 'margin-to-price' ? (
            <>
              <FormField id="calc-cost-a" label="Unit Cost ($)">
                <input
                  id="calc-cost-a"
                  type="number"
                  className="form-input"
                  placeholder="e.g. 25.00"
                  min="0"
                  step="0.01"
                  value={costA}
                  onChange={(e) => setCostA(e.target.value)}
                />
              </FormField>
              <FormField id="calc-margin-pct" label="Desired Margin (%)">
                <input
                  id="calc-margin-pct"
                  type="number"
                  className="form-input"
                  placeholder="e.g. 30"
                  min="0"
                  max="99.99"
                  step="0.1"
                  value={marginPct}
                  onChange={(e) => setMarginPct(e.target.value)}
                />
              </FormField>
            </>
          ) : (
            <>
              <FormField id="calc-cost-b" label="Unit Cost ($)">
                <input
                  id="calc-cost-b"
                  type="number"
                  className="form-input"
                  placeholder="e.g. 25.00"
                  min="0"
                  step="0.01"
                  value={costB}
                  onChange={(e) => setCostB(e.target.value)}
                />
              </FormField>
              <FormField id="calc-selling-price" label="Selling Price ($)">
                <input
                  id="calc-selling-price"
                  type="number"
                  className="form-input"
                  placeholder="e.g. 45.00"
                  min="0"
                  step="0.01"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                />
              </FormField>
            </>
          )}
        </div>

        {/* Results Output */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-sm)' }}>
            Result
          </h3>
          {mode === 'margin-to-price' ? (
            <>
              <div
                id="result-selling-price"
                style={{
                  padding: 'var(--space-lg)',
                  background: 'var(--accent-emerald-bg)',
                  border: '1px solid hsla(152, 70%, 45%, 0.2)',
                  borderRadius: 'var(--radius-lg)',
                  textAlign: 'center',
                }}
              >
                <div className="text-sm text-secondary" style={{ marginBottom: 'var(--space-xs)' }}>
                  Selling Price
                </div>
                <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--accent-emerald)' }}>
                  {computedSellingPrice !== null ? formatCurrency(computedSellingPrice) : '—'}
                </div>
              </div>
              <div
                id="result-profit"
                style={{
                  padding: 'var(--space-md)',
                  background: 'var(--accent-blue-bg)',
                  border: '1px solid hsla(210, 100%, 60%, 0.2)',
                  borderRadius: 'var(--radius-lg)',
                  textAlign: 'center',
                }}
              >
                <div className="text-sm text-secondary" style={{ marginBottom: 'var(--space-xs)' }}>
                  Profit per Unit
                </div>
                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--accent-blue)' }}>
                  {computedProfit !== null ? formatCurrency(computedProfit) : '—'}
                </div>
              </div>
            </>
          ) : (
            <>
              <div
                id="result-margin-pct"
                style={{
                  padding: 'var(--space-lg)',
                  background: 'var(--accent-amber-bg)',
                  border: '1px solid hsla(38, 100%, 60%, 0.2)',
                  borderRadius: 'var(--radius-lg)',
                  textAlign: 'center',
                }}
              >
                <div className="text-sm text-secondary" style={{ marginBottom: 'var(--space-xs)' }}>
                  Profit Margin
                </div>
                <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--accent-amber)' }}>
                  {computedMarginPct !== null ? `${computedMarginPct.toFixed(2)}%` : '—'}
                </div>
              </div>
              <div
                id="result-markup-pct"
                style={{
                  padding: 'var(--space-md)',
                  background: 'var(--accent-blue-bg)',
                  border: '1px solid hsla(210, 100%, 60%, 0.2)',
                  borderRadius: 'var(--radius-lg)',
                  textAlign: 'center',
                }}
              >
                <div className="text-sm text-secondary" style={{ marginBottom: 'var(--space-xs)' }}>
                  Markup
                </div>
                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--accent-blue)' }}>
                  {computedMarkupPct !== null ? `${computedMarkupPct.toFixed(2)}%` : '—'}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Landed Cost Calculator */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-lg)' }}>
          Landed Cost Calculator
        </h3>
        <div className="form-row">
          <FormField id="landed-purchase-cost" label="Purchase Cost ($)">
            <input
              id="landed-purchase-cost"
              type="number"
              className="form-input"
              placeholder="0.00"
              min="0"
              step="0.01"
              value={purchaseCost}
              onChange={(e) => setPurchaseCost(e.target.value)}
            />
          </FormField>
          <FormField id="landed-freight" label="Freight ($)">
            <input
              id="landed-freight"
              type="number"
              className="form-input"
              placeholder="0.00"
              min="0"
              step="0.01"
              value={freight}
              onChange={(e) => setFreight(e.target.value)}
            />
          </FormField>
          <FormField id="landed-insurance" label="Insurance ($)">
            <input
              id="landed-insurance"
              type="number"
              className="form-input"
              placeholder="0.00"
              min="0"
              step="0.01"
              value={insurance}
              onChange={(e) => setInsurance(e.target.value)}
            />
          </FormField>
        </div>
        <div className="form-row">
          <FormField id="landed-customs-duty" label="Customs Duty (%)">
            <input
              id="landed-customs-duty"
              type="number"
              className="form-input"
              placeholder="0"
              min="0"
              step="0.1"
              value={customsDutyPct}
              onChange={(e) => setCustomsDutyPct(e.target.value)}
            />
          </FormField>
          <FormField id="landed-tax" label="Tax (%)">
            <input
              id="landed-tax"
              type="number"
              className="form-input"
              placeholder="0"
              min="0"
              step="0.1"
              value={taxPct}
              onChange={(e) => setTaxPct(e.target.value)}
            />
          </FormField>
          <FormField id="landed-other" label="Other Costs ($)">
            <input
              id="landed-other"
              type="number"
              className="form-input"
              placeholder="0.00"
              min="0"
              step="0.01"
              value={otherCosts}
              onChange={(e) => setOtherCosts(e.target.value)}
            />
          </FormField>
        </div>

        {/* Landed Cost Breakdown */}
        <div className="grid-4" style={{ marginTop: 'var(--space-lg)' }}>
          <div
            id="landed-subtotal"
            style={{
              padding: 'var(--space-md)',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              textAlign: 'center',
            }}
          >
            <div className="text-xs text-secondary" style={{ marginBottom: 'var(--space-xs)' }}>
              Subtotal
            </div>
            <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)' }}>
              {formatCurrency(landedCost.subtotal)}
            </div>
          </div>
          <div
            id="landed-duty"
            style={{
              padding: 'var(--space-md)',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              textAlign: 'center',
            }}
          >
            <div className="text-xs text-secondary" style={{ marginBottom: 'var(--space-xs)' }}>
              Customs Duty
            </div>
            <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--accent-amber)' }}>
              {formatCurrency(landedCost.dutyAmount)}
            </div>
          </div>
          <div
            id="landed-tax"
            style={{
              padding: 'var(--space-md)',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              textAlign: 'center',
            }}
          >
            <div className="text-xs text-secondary" style={{ marginBottom: 'var(--space-xs)' }}>
              Tax
            </div>
            <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--accent-amber)' }}>
              {formatCurrency(landedCost.taxAmount)}
            </div>
          </div>
          <div
            id="landed-total"
            style={{
              padding: 'var(--space-md)',
              background: 'var(--accent-emerald-bg)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid hsla(152, 70%, 45%, 0.2)',
              textAlign: 'center',
            }}
          >
            <div className="text-xs text-secondary" style={{ marginBottom: 'var(--space-xs)' }}>
              Total Landed Cost
            </div>
            <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--accent-emerald)' }}>
              {formatCurrency(landedCost.total)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
