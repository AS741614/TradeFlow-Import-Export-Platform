'use client';

import { useState } from 'react';
import { CURRENCIES } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';

// Hardcoded exchange rates against USD (no external API)
const RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83.12,
  CNY: 7.24,
  JPY: 154.50,
  AED: 3.67,
  SGD: 1.34,
  AUD: 1.53,
  CAD: 1.36,
};

/**
 * Convert an amount from one currency to another via USD cross-rate.
 */
function convert(amount: number, from: string, to: string): number {
  const fromRate = RATES[from] ?? 1;
  const toRate = RATES[to] ?? 1;
  return (amount / fromRate) * toRate;
}

export default function CurrencyPage() {
  const [amount, setAmount] = useState('1000');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EUR');

  const numericAmount = parseFloat(amount) || 0;
  const convertedAmount = convert(numericAmount, fromCurrency, toCurrency);

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  // Find symbols for display
  const toSymbol = CURRENCIES.find((c) => c.code === toCurrency)?.symbol ?? '';
  const fromSymbol = CURRENCIES.find((c) => c.code === fromCurrency)?.symbol ?? '';

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-top">
          <h1>Currency Converter</h1>
        </div>
        <p>Convert between major trade currencies using reference exchange rates.</p>
      </div>

      {/* Converter Card */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="form-row" style={{ alignItems: 'flex-end' }}>
          {/* Amount */}
          <div className="form-group">
            <label className="form-label" htmlFor="currency-amount">
              Amount
            </label>
            <input
              id="currency-amount"
              type="number"
              className="form-input"
              placeholder="Enter amount"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {/* From Currency */}
          <div className="form-group">
            <label className="form-label" htmlFor="currency-from">
              From
            </label>
            <select
              id="currency-from"
              className="form-select"
              value={fromCurrency}
              onChange={(e) => setFromCurrency(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Swap Button */}
          <div className="form-group" style={{ flex: '0 0 auto' }}>
            <button
              id="currency-swap-btn"
              className="btn btn-secondary btn-icon"
              onClick={handleSwap}
              title="Swap currencies"
              style={{ marginBottom: 0 }}
            >
              <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, stroke: 'currentColor', fill: 'none', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                <polyline points="17 1 21 5 17 9" />
                <path d="M3 11V9a4 4 0 014-4h14" />
                <polyline points="7 23 3 19 7 15" />
                <path d="M21 13v2a4 4 0 01-4 4H3" />
              </svg>
            </button>
          </div>

          {/* To Currency */}
          <div className="form-group">
            <label className="form-label" htmlFor="currency-to">
              To
            </label>
            <select
              id="currency-to"
              className="form-select"
              value={toCurrency}
              onChange={(e) => setToCurrency(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Converted Output */}
        <div
          id="currency-result"
          style={{
            marginTop: 'var(--space-xl)',
            padding: 'var(--space-xl)',
            background: 'var(--accent-blue-bg)',
            border: '1px solid hsla(210, 100%, 60%, 0.2)',
            borderRadius: 'var(--radius-lg)',
            textAlign: 'center',
          }}
        >
          <div className="text-sm text-secondary" style={{ marginBottom: 'var(--space-sm)' }}>
            {fromSymbol} {numericAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {fromCurrency} =
          </div>
          <div
            style={{
              fontSize: 'var(--font-size-4xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--accent-blue)',
              lineHeight: 'var(--line-height-tight)',
            }}
          >
            {formatCurrency(convertedAmount, toCurrency)}
          </div>
          <div className="text-xs text-tertiary" style={{ marginTop: 'var(--space-sm)' }}>
            1 {fromCurrency} = {convert(1, fromCurrency, toCurrency).toFixed(4)} {toCurrency} · 1 {toCurrency} = {convert(1, toCurrency, fromCurrency).toFixed(4)} {fromCurrency}
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="data-table-wrapper">
        <div className="data-table-header">
          <h3>
            {fromSymbol}{numericAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {fromCurrency} in All Currencies
          </h3>
        </div>
        <table className="data-table" id="currency-comparison-table">
          <thead>
            <tr>
              <th>Currency</th>
              <th>Code</th>
              <th>Rate (vs {fromCurrency})</th>
              <th>Converted Amount</th>
            </tr>
          </thead>
          <tbody>
            {CURRENCIES.map((c, i) => {
              const rate = convert(1, fromCurrency, c.code);
              const converted = convert(numericAmount, fromCurrency, c.code);
              const isSelected = c.code === toCurrency;
              return (
                <tr
                  key={c.code}
                  className="stagger-item"
                  style={isSelected ? { background: 'var(--accent-blue-bg)' } : undefined}
                >
                  <td>
                    <span style={{ fontWeight: 'var(--font-weight-medium)' }}>
                      {c.symbol} {c.name}
                    </span>
                  </td>
                  <td>
                    <span className={isSelected ? 'badge status-info' : ''}>{c.code}</span>
                  </td>
                  <td className="text-secondary">{rate.toFixed(4)}</td>
                  <td style={{ fontWeight: 'var(--font-weight-semibold)' }}>
                    {formatCurrency(converted, c.code)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
