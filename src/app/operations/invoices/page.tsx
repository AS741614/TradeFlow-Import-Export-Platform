'use client';

import { useState, useCallback, useEffect } from 'react';
import { getItems, addItem, updateItem, removeItem } from '@/lib/storage';
import { generateId, formatCurrency, formatDate, getStatusColor, nowISO, toISODate } from '@/lib/utils';
import { CURRENCIES } from '@/lib/constants';
import type { Invoice, InvoiceStatus, Contact, LineItem } from '@/lib/types';
import { StorageError } from '@/lib/api-client';
import Loading from '@/components/Loading';
import ErrorBanner from '@/components/ErrorBanner';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { FormField } from '@/components/ui/FormField';

const EMPTY_LINE_ITEM = {
  description: '',
  quantity: 1,
  unitPrice: 0,
};

const EMPTY_FORM = {
  number: '',
  contactId: '',
  contactName: '',
  lineItems: [] as LineItem[],
  currency: 'USD',
  taxRate: 5, // 5% default tax
  status: 'draft' as InvoiceStatus,
  issuedDate: '',
  dueDate: '',
  notes: '',
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // Line item adder in form
  const [tempItem, setTempItem] = useState(EMPTY_LINE_ITEM);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [invoicesData, contactsData] = await Promise.all([
          getItems<Invoice>('invoices'),
          getItems<Contact>('contacts'),
        ]);
        if (!cancelled) {
          setInvoices(invoicesData);
          setContacts(contactsData);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof StorageError ? err.message : 'Failed to load invoices or contacts');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = invoices.filter((inv) => {
    const q = search.toLowerCase();
    return (
      inv.number.toLowerCase().includes(q) ||
      inv.contactName.toLowerCase().includes(q) ||
      inv.status.toLowerCase().includes(q)
    );
  });

  const openAdd = useCallback(() => {
    setEditingId(null);
    // Generate a default invoice number based on date and count
    const num = `INV-${String(new Date().getFullYear())}-${(invoices.length + 1).toString().padStart(3, '0')}`;
    setForm({
      ...EMPTY_FORM,
      number: num,
      issuedDate: toISODate(),
      dueDate: toISODate(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    setTempItem(EMPTY_LINE_ITEM);
    setShowModal(true);
  }, [invoices.length]);

  const openEdit = useCallback((invoice: Invoice) => {
    setEditingId(invoice.id);
    setForm({
      number: invoice.number,
      contactId: invoice.contactId,
      contactName: invoice.contactName,
      lineItems: invoice.lineItems,
      currency: invoice.currency,
      taxRate: invoice.taxRate,
      status: invoice.status,
      issuedDate: invoice.issuedDate,
      dueDate: invoice.dueDate,
      notes: invoice.notes ?? '',
    });
    setTempItem(EMPTY_LINE_ITEM);
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }, []);

  const updateField = useCallback(
    <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  // Auto calculate totals whenever line items, tax rate, or currency changes
  const calculateTotals = (items: LineItem[], taxRate: number) => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = parseFloat(((subtotal * taxRate) / 100).toFixed(2));
    const total = parseFloat((subtotal + tax).toFixed(2));
    return { subtotal, tax, total };
  };

  const handleAddLineItem = () => {
    if (!tempItem.description.trim() || tempItem.unitPrice <= 0 || tempItem.quantity <= 0) return;

    const newItem: LineItem = {
      id: generateId(),
      description: tempItem.description,
      quantity: tempItem.quantity,
      unitPrice: tempItem.unitPrice,
      total: parseFloat((tempItem.quantity * tempItem.unitPrice).toFixed(2)),
    };

    const updatedItems = [...form.lineItems, newItem];
    updateField('lineItems', updatedItems);
    setTempItem(EMPTY_LINE_ITEM);
  };

  const handleRemoveLineItem = (itemId: string) => {
    const updatedItems = form.lineItems.filter((item) => item.id !== itemId);
    updateField('lineItems', updatedItems);
  };

  const handleSubmit = useCallback(async () => {
    if (!form.number.trim() || !form.contactId || form.lineItems.length === 0) return;

    const contact = contacts.find((c) => c.id === form.contactId);
    const contactName = contact ? contact.company : 'Unknown Contact';

    const { subtotal, tax, total } = calculateTotals(form.lineItems, form.taxRate);

    try {
      if (editingId) {
        const updated = await updateItem<Invoice>('invoices', editingId, {
          ...form,
          contactName,
          subtotal,
          tax,
          total,
        });
        setInvoices(updated);
      } else {
        const newInvoice: Invoice = {
          id: generateId(),
          ...form,
          contactName,
          subtotal,
          tax,
          total,
          createdAt: nowISO(),
        };
        const updated = await addItem<Invoice>('invoices', newInvoice);
        setInvoices(updated);
      }
      closeModal();
    } catch (err) {
      setError(err instanceof StorageError ? err.message : 'Failed to save invoice');
    }
  }, [form, editingId, contacts, closeModal]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const updated = await removeItem<Invoice>('invoices', id);
      setInvoices(updated);
    } catch (err) {
      setError(err instanceof StorageError ? err.message : 'Failed to delete invoice');
    }
  }, []);



  const { subtotal: activeSubtotal, tax: activeTax, total: activeTotal } = calculateTotals(form.lineItems, form.taxRate);

  const columns: Column<Invoice>[] = [
    {
      key: 'number',
      header: 'Invoice Number',
      cellClassName: 'font-semibold',
    },
    {
      key: 'contactName',
      header: 'Contact / Company',
    },
    {
      key: 'total',
      header: 'Amount',
      render: (invoice) => formatCurrency(invoice.total, invoice.currency),
    },
    {
      key: 'issuedDate',
      header: 'Issued',
      render: (invoice) => formatDate(invoice.issuedDate),
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      render: (invoice) => formatDate(invoice.dueDate),
    },
    {
      key: 'status',
      header: 'Status',
      render: (invoice) => (
        <span className={`badge ${getStatusColor(invoice.status === 'paid' ? 'success' : invoice.status === 'sent' ? 'info' : invoice.status === 'overdue' ? 'danger' : 'neutral')}`}>
          {invoice.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (invoice) => (
        <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
          <button
            id={`btn-edit-invoice-${invoice.id}`}
            className="btn btn-ghost btn-sm btn-icon"
            onClick={() => openEdit(invoice)}
            title="Edit"
          >
            <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
          </button>
          <button
            id={`btn-delete-invoice-${invoice.id}`}
            className="btn btn-danger btn-sm btn-icon"
            onClick={() => { void handleDelete(invoice.id); }}
            title="Delete"
          >
            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
          </button>
        </div>
      ),
    },
  ];

  const itemColumns: Column<LineItem>[] = [
    {
      key: 'description',
      header: 'Description',
    },
    {
      key: 'quantity',
      header: 'Qty',
    },
    {
      key: 'unitPrice',
      header: 'Unit Price',
      render: (item) => formatCurrency(item.unitPrice, form.currency),
    },
    {
      key: 'total',
      header: 'Total',
      render: (item) => formatCurrency(item.total, form.currency),
    },
    {
      key: 'actions',
      header: '',
      render: (item) => (
        <button
          id={`btn-remove-invoice-item-${item.id}`}
          className="btn btn-ghost btn-sm btn-icon"
          type="button"
          onClick={() => handleRemoveLineItem(item.id)}
        >
          ✕
        </button>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-top">
          <h1>Invoices</h1>
          <button id="btn-create-invoice" className="btn btn-primary" onClick={openAdd}>
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Create Invoice
          </button>
        </div>
        <p>Issue, track, and manage commercial billing invoices for global clients.</p>
      </div>

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <Loading />
      ) : (
        /* Data Table */
        <div className="data-table-wrapper">
          <div className="data-table-header">
            <h3>{filtered.length} Invoice{filtered.length !== 1 ? 's' : ''}</h3>
            <div className="data-table-actions">
              <input
                id="input-invoices-search"
                className="form-input"
                type="text"
                placeholder="Search invoice or contact..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: 260, height: 36 }}
              />
            </div>
          </div>

          <DataTable
            id="invoices-table"
            columns={columns}
            data={filtered}
            keyExtractor={(item) => item.id}
            emptyState={
              <div className="data-table-empty">
                <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                <p>No invoices found. Create your first commercial invoice to get started.</p>
              </div>
            }
          />
        </div>
      )}

      {/* Invoice Modal */}
      <Modal
        id="invoice-modal"
        isOpen={showModal}
        onClose={closeModal}
        title={editingId ? 'Edit Invoice' : 'Create Invoice'}
        footer={
          <>
            <button id="btn-cancel-invoice" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button
              id="btn-save-invoice"
              className="btn btn-primary"
              onClick={() => { void handleSubmit(); }}
              disabled={!form.number.trim() || !form.contactId || form.lineItems.length === 0}
            >
              {editingId ? 'Update Invoice' : 'Create Invoice'}
            </button>
          </>
        }
      >
        <div className="form-row">
          <FormField id="input-invoice-number" label="Invoice Number" required>
            <input
              type="text"
              placeholder="e.g. INV-2026-001"
              value={form.number}
              onChange={(e) => updateField('number', e.target.value)}
            />
          </FormField>
          <FormField id="select-invoice-status" label="Status">
            <select
              value={form.status}
              onChange={(e) => updateField('status', e.target.value as InvoiceStatus)}
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </FormField>
        </div>

        <div className="form-row">
          <FormField id="select-invoice-contact" label="Billing Contact" required>
            <select
              value={form.contactId}
              onChange={(e) => updateField('contactId', e.target.value)}
            >
              <option value="">-- Select Contact Company --</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>{c.company} ({c.contactPerson})</option>
              ))}
            </select>
          </FormField>
          <FormField id="select-invoice-currency" label="Currency">
            <select
              value={form.currency}
              onChange={(e) => updateField('currency', e.target.value)}
            >
              {CURRENCIES.map((cur) => (
                <option key={cur.code} value={cur.code}>{cur.code} — {cur.name}</option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="form-row">
          <FormField id="input-invoice-issued" label="Issue Date" required>
            <input
              type="date"
              value={form.issuedDate}
              onChange={(e) => updateField('issuedDate', e.target.value)}
            />
          </FormField>
          <FormField id="input-invoice-due" label="Due Date" required>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => updateField('dueDate', e.target.value)}
            />
          </FormField>
        </div>

        {/* Line Items Section */}
        <div style={{ marginTop: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
          <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-sm)' }}>
            Line Items
          </h4>

          <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', marginBottom: 'var(--space-md)' }}>
            <input
              id="input-invoice-item-desc"
              className="form-input"
              placeholder="Description (e.g. Organic Cotton Roll)"
              value={tempItem.description}
              onChange={(e) => setTempItem({ ...tempItem, description: e.target.value })}
              style={{ flex: 3 }}
            />
            <input
              id="input-invoice-item-qty"
              className="form-input"
              type="number"
              min={1}
              placeholder="Qty"
              value={tempItem.quantity || ''}
              onChange={(e) => setTempItem({ ...tempItem, quantity: parseInt(e.target.value) || 0 })}
              style={{ flex: 1, minWidth: 60 }}
            />
            <input
              id="input-invoice-item-price"
              className="form-input"
              type="number"
              min={0.01}
              step={0.01}
              placeholder="Price"
              value={tempItem.unitPrice || ''}
              onChange={(e) => setTempItem({ ...tempItem, unitPrice: parseFloat(e.target.value) || 0 })}
              style={{ flex: 1.5, minWidth: 80 }}
            />
            <button
              id="btn-add-invoice-item"
              className="btn btn-secondary"
              type="button"
              onClick={handleAddLineItem}
              disabled={!tempItem.description.trim() || tempItem.unitPrice <= 0 || tempItem.quantity <= 0}
            >
              Add
            </button>
          </div>

          {form.lineItems.length > 0 ? (
            <div style={{ background: 'var(--bg-surface)', marginBottom: 'var(--space-md)' }}>
              <DataTable
                id="invoice-line-items-table"
                columns={itemColumns}
                data={form.lineItems}
                keyExtractor={(item) => item.id}
                className="line-items-table"
              />
            </div>
          ) : (
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', textAlign: 'center', margin: 'var(--space-md) 0' }}>
              Please add at least one line item to this invoice.
            </p>
          )}

          {/* Totals Summary */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-xs)', borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-sm)' }}>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
              Subtotal: <strong>{formatCurrency(activeSubtotal, form.currency)}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', fontSize: 'var(--font-size-sm)' }}>
              <span>Tax Rate (%):</span>
              <input
                id="input-invoice-tax-rate"
                className="form-input"
                type="number"
                min={0}
                value={form.taxRate}
                onChange={(e) => updateField('taxRate', parseFloat(e.target.value) || 0)}
                style={{ width: 70, height: 30, padding: '4px' }}
              />
              <span>Tax: {formatCurrency(activeTax, form.currency)}</span>
            </div>
            <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-bold)', color: 'var(--accent-blue)', marginTop: '4px' }}>
              Total: {formatCurrency(activeTotal, form.currency)}
            </div>
          </div>
        </div>

        <FormField id="textarea-invoice-notes" label="Notes" containerClassName="invoice-notes-field">
          <textarea
            placeholder="Wire instructions, payment conditions, Incoterm details..."
            value={form.notes}
            onChange={(e) => updateField('notes', e.target.value)}
          />
        </FormField>
      </Modal>
    </div>
  );
}
