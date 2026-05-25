'use client';

import { useEffect, useState, useCallback } from 'react';
import { getItems, addItem, updateItem, removeItem, STORAGE_KEYS } from '@/lib/storage';
import { generateId, formatDate, getStatusColor, nowISO } from '@/lib/utils';
import type { ComplianceItem, Shipment } from '@/lib/types';

const EMPTY_FORM = {
  shipmentId: '',
  documentName: '',
  documentType: 'commercial-invoice',
  status: 'pending' as 'pending' | 'submitted' | 'approved' | 'rejected',
  requiredBy: '',
  notes: '',
};

const COMPLIANCE_DOC_TYPES = [
  { code: 'bill-of-lading', name: 'Bill of Lading' },
  { code: 'commercial-invoice', name: 'Commercial Invoice' },
  { code: 'packing-list', name: 'Packing List' },
  { code: 'certificate-of-origin', name: 'Certificate of Origin' },
  { code: 'customs-declaration', name: 'Customs Declaration' },
  { code: 'insurance', name: 'Insurance Certificate' },
  { code: 'other', name: 'Other Document' },
];

export default function CompliancePage() {
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let storedCompliance = getItems<ComplianceItem>(STORAGE_KEYS.COMPLIANCE);
    const storedShipments = getItems<Shipment>(STORAGE_KEYS.SHIPMENTS);

    // If there's no compliance items, let's seed a couple default ones if we have shipments, or just standard ones
    if (storedCompliance.length === 0) {
      const now = nowISO().split('T')[0] ?? ''; // strict-ts-deferred: assert at constants source in later prompt
      const defaults: ComplianceItem[] = [
        {
          id: generateId(),
          documentName: 'Export Customs Declaration',
          documentType: 'customs-declaration',
          status: 'pending',
          requiredBy: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] ?? '', // strict-ts-deferred: assert at constants source in later prompt
          notes: 'Required for cargo clearance at local custom port.',
        },
        {
          id: generateId(),
          documentName: 'Commercial Invoice & Packing List',
          documentType: 'commercial-invoice',
          status: 'approved',
          requiredBy: now,
          notes: 'Completed and verified by trade operations manager.',
        },
      ];

      const d0 = defaults[0];
      const d1 = defaults[1];
      const s0 = storedShipments[0];
      if (d0 && d1 && s0) {
        d0.shipmentId = s0.id;
        d1.shipmentId = s0.id;
      }

      defaults.forEach((item) => addItem(STORAGE_KEYS.COMPLIANCE, item));
      storedCompliance = defaults;
    }

    setTimeout(() => {
      setShipments(storedShipments);
      setComplianceItems(storedCompliance);
      setInitialized(true);
    }, 0);
  }, []);

  const openAdd = useCallback(() => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      requiredBy: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] ?? '', // strict-ts-deferred: assert at constants source in later prompt
    });
    setShowModal(true);
  }, []);

  const openEdit = useCallback((item: ComplianceItem) => {
    setEditingId(item.id);
    setForm({
      shipmentId: item.shipmentId ?? '',
      documentName: item.documentName,
      documentType: item.documentType,
      status: item.status,
      requiredBy: item.requiredBy,
      notes: item.notes ?? '',
    });
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

  const handleSubmit = useCallback(() => {
    if (!form.documentName.trim() || !form.requiredBy) return;

    if (editingId) {
      const updated = updateItem<ComplianceItem>(STORAGE_KEYS.COMPLIANCE, editingId, {
        ...form,
        submittedAt: form.status === 'submitted' || form.status === 'approved' ? nowISO() : undefined,
        approvedAt: form.status === 'approved' ? nowISO() : undefined,
      });
      setComplianceItems(updated);
    } else {
      const newItem: ComplianceItem = {
        id: generateId(),
        ...form,
        submittedAt: form.status === 'submitted' || form.status === 'approved' ? nowISO() : undefined,
        approvedAt: form.status === 'approved' ? nowISO() : undefined,
      };
      const updated = addItem<ComplianceItem>(STORAGE_KEYS.COMPLIANCE, newItem);
      setComplianceItems(updated);
    }
    closeModal();
  }, [form, editingId, closeModal]);

  const handleDelete = useCallback((id: string) => {
    const updated = removeItem<ComplianceItem>(STORAGE_KEYS.COMPLIANCE, id);
    setComplianceItems(updated);
  }, []);

  const getShipmentRef = (shipmentId?: string) => {
    if (!shipmentId) return 'General Compliance';
    const sh = shipments.find((s) => s.id === shipmentId);
    return sh ? `Shipment: ${sh.reference}` : 'General Compliance';
  };

  const filtered = complianceItems.filter((item) => {
    if (statusFilter === 'all') return true;
    return item.status === statusFilter;
  });

  if (!initialized) {
    return (
      <div className="empty-state">
        <p>Loading compliance checklists...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-top">
          <h1>Compliance & Documentation</h1>
          <button id="btn-add-compliance-item" className="btn btn-primary" onClick={openAdd}>
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add Checklist Item
          </button>
        </div>
        <p>Audit and manage trade documentation, customs clearance requirements, and regulatory checklists.</p>
      </div>

      {/* Stats Counter & Filter */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="metric-card blue stagger-item">
          <div className="metric-card-content">
            <div className="metric-card-label">Total Documents</div>
            <div className="metric-card-value">{complianceItems.length}</div>
          </div>
        </div>
        <div className="metric-card emerald stagger-item">
          <div className="metric-card-content">
            <div className="metric-card-label">Approved</div>
            <div className="metric-card-value">{complianceItems.filter((i) => i.status === 'approved').length}</div>
          </div>
        </div>
        <div className="metric-card amber stagger-item">
          <div className="metric-card-content">
            <div className="metric-card-label">Pending Reviews</div>
            <div className="metric-card-value">{complianceItems.filter((i) => i.status === 'submitted' || i.status === 'pending').length}</div>
          </div>
        </div>
        <div className="metric-card red stagger-item">
          <div className="metric-card-content">
            <div className="metric-card-label">Rejected / Action Needed</div>
            <div className="metric-card-value">{complianceItems.filter((i) => i.status === 'rejected').length}</div>
          </div>
        </div>
      </div>

      {/* Filter and Tab Section */}
      <div className="card" style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-md)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
            {['all', 'pending', 'submitted', 'approved', 'rejected'].map((st) => (
              <button
                key={st}
                id={`tab-compliance-filter-${st}`}
                className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setStatusFilter(st)}
                style={{ textTransform: 'capitalize' }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Compliance Table */}
      <div className="data-table-wrapper">
        {filtered.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Document Name</th>
                <th>Type</th>
                <th>Linked Shipment / Scope</th>
                <th>Deadline</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="stagger-item">
                  <td>
                    <div style={{ fontWeight: 'var(--font-weight-medium)' }}>{item.documentName}</div>
                    {item.notes && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: '2px' }}>{item.notes}</div>}
                  </td>
                  <td>
                    <code style={{ fontSize: 'var(--font-size-xs)', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: 'var(--radius-sm)', textTransform: 'capitalize' }}>
                      {item.documentType.replace(/-/g, ' ')}
                    </code>
                  </td>
                  <td>{getShipmentRef(item.shipmentId)}</td>
                  <td>{formatDate(item.requiredBy)}</td>
                  <td>
                    <span className={`badge ${getStatusColor(item.status === 'approved' ? 'success' : item.status === 'submitted' ? 'info' : item.status === 'rejected' ? 'danger' : 'warning')}`}>
                      {item.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                      <button
                        id={`btn-edit-compliance-${item.id}`}
                        className="btn btn-ghost btn-sm btn-icon"
                        onClick={() => openEdit(item)}
                        title="Edit / Update Status"
                      >
                        <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </button>
                      <button
                        id={`btn-delete-compliance-${item.id}`}
                        className="btn btn-danger btn-sm btn-icon"
                        onClick={() => handleDelete(item.id)}
                        title="Delete"
                      >
                        <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="data-table-empty">
            <svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <p>No compliance records found for this filter category.</p>
          </div>
        )}
      </div>

      {/* Add / Edit Compliance Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Edit Compliance Item' : 'Add Compliance Item'}</h2>
              <button id="btn-close-compliance-modal" className="btn btn-ghost btn-icon btn-sm" onClick={closeModal}>
                <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label className="form-label" htmlFor="input-compliance-name">Document Name *</label>
                <input
                  id="input-compliance-name"
                  className="form-input"
                  type="text"
                  placeholder="e.g. Certificate of Origin (Chamber of Commerce)"
                  value={form.documentName}
                  onChange={(e) => updateField('documentName', e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="select-compliance-type">Document Category</label>
                  <select
                    id="select-compliance-type"
                    className="form-select"
                    value={form.documentType}
                    onChange={(e) => updateField('documentType', e.target.value)}
                  >
                    {COMPLIANCE_DOC_TYPES.map((dt) => (
                      <option key={dt.code} value={dt.code}>{dt.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="select-compliance-shipment">Associate with Shipment</label>
                  <select
                    id="select-compliance-shipment"
                    className="form-select"
                    value={form.shipmentId}
                    onChange={(e) => updateField('shipmentId', e.target.value)}
                  >
                    <option value="">General Compliance (Not shipment specific)</option>
                    {shipments.map((s) => (
                      <option key={s.id} value={s.id}>Ref: {s.reference} ({s.origin} → {s.destination})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="input-compliance-deadline">Deadline / Required By *</label>
                  <input
                    id="input-compliance-deadline"
                    className="form-input"
                    type="date"
                    value={form.requiredBy}
                    onChange={(e) => updateField('requiredBy', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="select-compliance-status">Verification Status</label>
                  <select
                    id="select-compliance-status"
                    className="form-select"
                    value={form.status}
                    onChange={(e) => updateField('status', e.target.value as 'pending' | 'submitted' | 'approved' | 'rejected')}
                  >
                    <option value="pending">Pending Documents</option>
                    <option value="submitted">Submitted (Under Review)</option>
                    <option value="approved">Approved & Cleared</option>
                    <option value="rejected">Rejected (Needs Revision)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="textarea-compliance-notes">Compliance Notes</label>
                <textarea
                  id="textarea-compliance-notes"
                  className="form-textarea"
                  placeholder="Additional directives, correction requests, contact info for the certifying authority..."
                  value={form.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button id="btn-cancel-compliance" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button
                id="btn-save-compliance"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={!form.documentName.trim() || !form.requiredBy}
              >
                {editingId ? 'Save Changes' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
