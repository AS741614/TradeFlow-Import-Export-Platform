'use client';

import { useState, useCallback } from 'react';
import { getItems, addItem, updateItem, removeItem, STORAGE_KEYS } from '@/lib/storage';
import { generateId, getStatusColor, nowISO } from '@/lib/utils';
import { COUNTRIES, INCOTERMS, DEFAULT_COUNTRY, DEFAULT_INCOTERM } from '@/lib/constants';
import type { Contact, ContactType, ContactStatus } from '@/lib/types';

const EMPTY_FORM = {
  company: '',
  contactPerson: '',
  email: '',
  phone: '',
  country: DEFAULT_COUNTRY,
  address: '',
  type: 'buyer' as ContactType,
  status: 'active' as ContactStatus,
  tradeTerms: DEFAULT_INCOTERM,
  notes: '',
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>(() => getItems<Contact>(STORAGE_KEYS.CONTACTS));
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      c.company.toLowerCase().includes(q) ||
      c.contactPerson.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.country.toLowerCase().includes(q);

    const matchesType = typeFilter === 'all' || c.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const openAdd = useCallback(() => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }, []);

  const openEdit = useCallback((contact: Contact) => {
    setEditingId(contact.id);
    setForm({
      company: contact.company,
      contactPerson: contact.contactPerson,
      email: contact.email,
      phone: contact.phone,
      country: contact.country,
      address: contact.address ?? '',
      type: contact.type,
      status: contact.status,
      tradeTerms: contact.tradeTerms ?? DEFAULT_INCOTERM,
      notes: contact.notes ?? '',
    });
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!form.company.trim() || !form.contactPerson.trim() || !form.email.trim()) return;

    const now = nowISO();

    if (editingId) {
      const updated = updateItem<Contact>(STORAGE_KEYS.CONTACTS, editingId, {
        ...form,
        updatedAt: now,
      });
      setContacts(updated);
    } else {
      const newContact: Contact = {
        id: generateId(),
        ...form,
        createdAt: now,
        updatedAt: now,
      };
      const updated = addItem<Contact>(STORAGE_KEYS.CONTACTS, newContact);
      setContacts(updated);
    }
    closeModal();
  }, [form, editingId, closeModal]);

  const handleDelete = useCallback((id: string) => {
    const updated = removeItem<Contact>(STORAGE_KEYS.CONTACTS, id);
    setContacts(updated);
  }, []);

  const updateField = useCallback(
    <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );



  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-top">
          <h1>Contacts Directory</h1>
          <button id="btn-add-contact" className="btn btn-primary" onClick={openAdd}>
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add Contact
          </button>
        </div>
        <p>Manage your relationships with international buyers, sourcing suppliers, and logistics partners.</p>
      </div>

      {/* Filters Hub */}
      <div className="card" style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-md)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="input-contacts-search">Search</label>
            <input
              id="input-contacts-search"
              className="form-input"
              type="text"
              placeholder="Search company, person, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="select-filter-type">Type</label>
            <select
              id="select-filter-type"
              className="form-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="buyer">Buyers</option>
              <option value="supplier">Suppliers</option>
              <option value="both">Both</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="select-filter-status">Status</label>
            <select
              id="select-filter-status"
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="prospect">Prospect</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contact Cards Grid */}
      <div className="grid-3" style={{ gap: 'var(--space-lg)' }}>
        {filtered.length > 0 ? (
          filtered.map((contact) => (
            <div key={contact.id} className="card stagger-item" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '220px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)' }}>{contact.company}</h3>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '2px' }}>👤 {contact.contactPerson}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                    <span className={`badge ${contact.type === 'supplier' ? 'status-amber' : contact.type === 'buyer' ? 'status-blue' : 'status-purple'}`}>
                      {contact.type}
                    </span>
                    <span className={`badge ${getStatusColor(contact.status === 'active' ? 'success' : contact.status === 'prospect' ? 'info' : 'neutral')}`} style={{ fontSize: '10px' }}>
                      {contact.status}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: 'var(--space-md)', fontSize: 'var(--font-size-sm)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', color: 'var(--text-secondary)' }}>
                    <span>✉️</span>
                    <span style={{ wordBreak: 'break-all' }}>{contact.email}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', color: 'var(--text-secondary)' }}>
                    <span>📞</span>
                    <span>{contact.phone}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', color: 'var(--text-secondary)' }}>
                    <span>📍</span>
                    <span>{contact.country}</span>
                  </div>
                  {contact.tradeTerms && (
                    <div style={{ marginTop: 'var(--space-xs)', fontSize: 'var(--font-size-xs)', background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', display: 'inline-block', width: 'fit-content' }}>
                      💼 {contact.tradeTerms}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 'var(--space-md)', paddingTop: 'var(--space-sm)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-xs)' }}>
                <button
                  id={`btn-edit-contact-${contact.id}`}
                  className="btn btn-ghost btn-sm btn-icon"
                  onClick={() => openEdit(contact)}
                  title="Edit"
                >
                  <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                </button>
                <button
                  id={`btn-delete-contact-${contact.id}`}
                  className="btn btn-danger btn-sm btn-icon"
                  onClick={() => handleDelete(contact.id)}
                  title="Delete"
                >
                  <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }}><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state card" style={{ gridColumn: '1 / -1' }}>
            <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            <h3>No contacts found</h3>
            <p>Expand your trade network by adding details for international buyers and supply sources.</p>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Edit Contact' : 'Add Contact'}</h2>
              <button id="btn-close-contact-modal" className="btn btn-ghost btn-icon btn-sm" onClick={closeModal}>
                <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="input-contact-company">Company Name *</label>
                  <input
                    id="input-contact-company"
                    className="form-input"
                    type="text"
                    placeholder="e.g. Pacific Trade Ltd."
                    value={form.company}
                    onChange={(e) => updateField('company', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="input-contact-person">Contact Person *</label>
                  <input
                    id="input-contact-person"
                    className="form-input"
                    type="text"
                    placeholder="e.g. John Doe"
                    value={form.contactPerson}
                    onChange={(e) => updateField('contactPerson', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="input-contact-email">Email Address *</label>
                  <input
                    id="input-contact-email"
                    className="form-input"
                    type="email"
                    placeholder="e.g. contact@pacifictrade.com"
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="input-contact-phone">Phone Number</label>
                  <input
                    id="input-contact-phone"
                    className="form-input"
                    type="text"
                    placeholder="e.g. +1 (555) 0199"
                    value={form.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="select-contact-country">Country</label>
                  <select
                    id="select-contact-country"
                    className="form-select"
                    value={form.country}
                    onChange={(e) => updateField('country', e.target.value)}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="select-contact-incoterms">Preferred Incoterms</label>
                  <select
                    id="select-contact-incoterms"
                    className="form-select"
                    value={form.tradeTerms}
                    onChange={(e) => updateField('tradeTerms', e.target.value)}
                  >
                    {INCOTERMS.map((term) => (
                      <option key={term} value={term}>{term}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="select-contact-type">Relationship Type</label>
                  <select
                    id="select-contact-type"
                    className="form-select"
                    value={form.type}
                    onChange={(e) => updateField('type', e.target.value as ContactType)}
                  >
                    <option value="buyer">Buyer</option>
                    <option value="supplier">Supplier</option>
                    <option value="both">Both (Partner)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="select-contact-status">Status</label>
                  <select
                    id="select-contact-status"
                    className="form-select"
                    value={form.status}
                    onChange={(e) => updateField('status', e.target.value as ContactStatus)}
                  >
                    <option value="active">Active</option>
                    <option value="prospect">Prospect</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="input-contact-address">Address</label>
                <input
                  id="input-contact-address"
                  className="form-input"
                  type="text"
                  placeholder="Street, City, State, ZIP"
                  value={form.address}
                  onChange={(e) => updateField('address', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="textarea-contact-notes">Notes / Special Agreements</label>
                <textarea
                  id="textarea-contact-notes"
                  className="form-textarea"
                  placeholder="Notes on communication style, trade history, specific requirements..."
                  value={form.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button id="btn-cancel-contact" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button
                id="btn-save-contact"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={!form.company.trim() || !form.contactPerson.trim() || !form.email.trim()}
              >
                {editingId ? 'Update Contact' : 'Add Contact'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
