'use client';

import { useState, useCallback, useEffect } from 'react';
import { getItems, addItem, updateItem, removeItem } from '@/lib/storage';
import { generateId, formatDate, getStatusColor, nowISO, toISODate } from '@/lib/utils';
import type { ComplianceItem, Shipment } from '@/lib/types';
import { StorageError } from '@/lib/api-client';
import Loading from '@/components/Loading';
import ErrorBanner from '@/components/ErrorBanner';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { FormField } from '@/components/ui/FormField';

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
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const storedShipments = await getItems<Shipment>('shipments');
        let storedCompliance = await getItems<ComplianceItem>('compliance');

        if (storedCompliance.length === 0) {
          const now = toISODate(nowISO());
          const defaults: ComplianceItem[] = [
            {
              id: generateId(),
              documentName: 'Export Customs Declaration',
              documentType: 'customs-declaration',
              status: 'pending',
              requiredBy: toISODate(Date.now() + 15 * 24 * 60 * 60 * 1000),
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

          const seeded: ComplianceItem[] = [];
          for (const item of defaults) {
            const added = await addItem<ComplianceItem>('compliance', item);
            seeded.splice(0, seeded.length, ...added);
          }
          storedCompliance = seeded;
        }

        if (!cancelled) {
          setShipments(storedShipments);
          setComplianceItems(storedCompliance);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof StorageError ? err.message : 'Failed to load compliance data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const openAdd = useCallback(() => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      requiredBy: toISODate(Date.now() + 10 * 24 * 60 * 60 * 1000),
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

  const handleSubmit = useCallback(async () => {
    if (!form.documentName.trim() || !form.requiredBy) return;

    setLoading(true);
    setError(null);
    try {
      if (editingId) {
        const updated = await updateItem<ComplianceItem>('compliance', editingId, {
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
        const updated = await addItem<ComplianceItem>('compliance', newItem);
        setComplianceItems(updated);
      }
      closeModal();
    } catch (err) {
      setError(err instanceof StorageError ? err.message : 'Failed to save compliance item');
    } finally {
      setLoading(false);
    }
  }, [form, editingId, closeModal]);

  const handleDelete = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await removeItem<ComplianceItem>('compliance', id);
      setComplianceItems(updated);
    } catch (err) {
      setError(err instanceof StorageError ? err.message : 'Failed to delete compliance item');
    } finally {
      setLoading(false);
    }
  }, []);

  const getShipmentRef = (shipmentId?: string) => {
    if (!shipmentId) return 'General Compliance';
    const sh = shipments.find((s) => s.id === shipmentId);
    return sh ? `Shipment: ${sh.reference}` : 'General Compliance';
  };

  const columns: Column<ComplianceItem>[] = [
    {
      key: 'documentName',
      header: 'Document Name',
      render: (item) => (
        <>
          <div style={{ fontWeight: 'var(--font-weight-medium)' }}>{item.documentName}</div>
          {item.notes && (
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: '2px' }}>
              {item.notes}
            </div>
          )}
        </>
      ),
    },
    {
      key: 'documentType',
      header: 'Type',
      render: (item) => (
        <code style={{ fontSize: 'var(--font-size-xs)', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: 'var(--radius-sm)', textTransform: 'capitalize' }}>
          {item.documentType.replace(/-/g, ' ')}
        </code>
      ),
    },
    {
      key: 'shipmentId',
      header: 'Linked Shipment / Scope',
      render: (item) => getShipmentRef(item.shipmentId),
    },
    {
      key: 'requiredBy',
      header: 'Deadline',
      render: (item) => formatDate(item.requiredBy),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => (
        <span className={`badge ${getStatusColor(item.status === 'approved' ? 'success' : item.status === 'submitted' ? 'info' : item.status === 'rejected' ? 'danger' : 'warning')}`}>
          {item.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item) => (
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
            onClick={() => { void handleDelete(item.id); }}
            title="Delete"
          >
            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
          </button>
        </div>
      ),
    },
  ];

  const filtered = complianceItems.filter((item) => {
    if (statusFilter === 'all') return true;
    return item.status === statusFilter;
  });

  if (loading) return <Loading />;

  return (
    <div className="animate-fade-in">
      {error && <ErrorBanner message={error} />}
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
      <DataTable
        id="compliance-table"
        columns={columns}
        data={filtered}
        keyExtractor={(item) => item.id}
        emptyState={
          <div className="data-table-empty">
            <svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <p>No compliance records found for this filter category.</p>
          </div>
        }
      />

      {/* Add / Edit Compliance Modal */}
      <Modal
        id="compliance-modal"
        isOpen={showModal}
        onClose={closeModal}
        title={editingId ? 'Edit Compliance Item' : 'Add Compliance Item'}
        footer={
          <>
            <button id="btn-cancel-compliance" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button
              id="btn-save-compliance"
              className="btn btn-primary"
              onClick={() => { void handleSubmit(); }}
              disabled={!form.documentName.trim() || !form.requiredBy}
            >
              {editingId ? 'Save Changes' : 'Add Item'}
            </button>
          </>
        }
      >
        <FormField id="input-compliance-name" label="Document Name" required>
          <input
            type="text"
            placeholder="e.g. Certificate of Origin (Chamber of Commerce)"
            value={form.documentName}
            onChange={(e) => updateField('documentName', e.target.value)}
          />
        </FormField>

        <div className="form-row">
          <FormField id="select-compliance-type" label="Document Category">
            <select
              value={form.documentType}
              onChange={(e) => updateField('documentType', e.target.value)}
            >
              {COMPLIANCE_DOC_TYPES.map((dt) => (
                <option key={dt.code} value={dt.code}>{dt.name}</option>
              ))}
            </select>
          </FormField>

          <FormField id="select-compliance-shipment" label="Associate with Shipment">
            <select
              value={form.shipmentId}
              onChange={(e) => updateField('shipmentId', e.target.value)}
            >
              <option value="">General Compliance (Not shipment specific)</option>
              {shipments.map((s) => (
                <option key={s.id} value={s.id}>Ref: {s.reference} ({s.origin} → {s.destination})</option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="form-row">
          <FormField id="input-compliance-deadline" label="Deadline / Required By" required>
            <input
              type="date"
              value={form.requiredBy}
              onChange={(e) => updateField('requiredBy', e.target.value)}
            />
          </FormField>

          <FormField id="select-compliance-status" label="Verification Status">
            <select
              value={form.status}
              onChange={(e) => updateField('status', e.target.value as 'pending' | 'submitted' | 'approved' | 'rejected')}
            >
              <option value="pending">Pending Documents</option>
              <option value="submitted">Submitted (Under Review)</option>
              <option value="approved">Approved & Cleared</option>
              <option value="rejected">Rejected (Needs Revision)</option>
            </select>
          </FormField>
        </div>

        <FormField id="textarea-compliance-notes" label="Compliance Notes">
          <textarea
            placeholder="Additional directives, correction requests, contact info for the certifying authority..."
            value={form.notes}
            onChange={(e) => updateField('notes', e.target.value)}
          />
        </FormField>
      </Modal>
    </div>
  );
}
