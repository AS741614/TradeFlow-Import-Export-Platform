'use client';

import { useState, useCallback, useEffect } from 'react';
import { getItems, addItem, updateItem, removeItem } from '@/lib/storage';
import { generateId, formatDate, nowISO } from '@/lib/utils';
import { COUNTRIES, CARRIERS, DEFAULT_COUNTRY, DEFAULT_DESTINATION_COUNTRY, DEFAULT_CARRIER } from '@/lib/constants';
import type { Shipment, ShipmentStatus, Product, ShipmentProduct } from '@/lib/types';
import { StorageError } from '@/lib/api-client';
import Loading from '@/components/Loading';
import ErrorBanner from '@/components/ErrorBanner';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { FormField } from '@/components/ui/FormField';

const STATUS_FLOW: ShipmentStatus[] = ['ordered', 'shipped', 'in-transit', 'customs', 'delivered'];

const EMPTY_FORM = {
  reference: '',
  origin: DEFAULT_COUNTRY,
  destination: DEFAULT_DESTINATION_COUNTRY,
  carrier: DEFAULT_CARRIER,
  trackingNumber: '',
  estimatedArrival: '',
  status: 'ordered' as ShipmentStatus,
  notes: '',
  products: [] as ShipmentProduct[],
};

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // For adding products to the shipment
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedProductQty, setSelectedProductQty] = useState(1);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [shipmentsData, productsData] = await Promise.all([
          getItems<Shipment>('shipments'),
          getItems<Product>('products'),
        ]);
        if (!cancelled) {
          setShipments(shipmentsData);
          setProducts(productsData);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof StorageError ? err.message : 'Failed to load shipments');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = shipments.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.reference.toLowerCase().includes(q) ||
      s.origin.toLowerCase().includes(q) ||
      s.destination.toLowerCase().includes(q) ||
      s.carrier.toLowerCase().includes(q) ||
      (s.trackingNumber?.toLowerCase().includes(q))
    );
  });

  const openAdd = useCallback(() => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSelectedProductId('');
    setSelectedProductQty(1);
    setShowModal(true);
  }, []);

  const openEdit = useCallback((shipment: Shipment) => {
    setEditingId(shipment.id);
    setForm({
      reference: shipment.reference,
      origin: shipment.origin,
      destination: shipment.destination,
      carrier: shipment.carrier,
      trackingNumber: shipment.trackingNumber ?? '',
      estimatedArrival: shipment.estimatedArrival,
      status: shipment.status,
      notes: shipment.notes ?? '',
      products: shipment.products,
    });
    setSelectedProductId('');
    setSelectedProductQty(1);
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form.reference.trim()) return;

    const now = nowISO();
    setLoading(true);
    setError(null);

    try {
      if (editingId) {
        const updated = await updateItem<Shipment>('shipments', editingId, {
          ...form,
          updatedAt: now,
        });
        setShipments(updated);
      } else {
        const newShipment: Shipment = {
          id: generateId(),
          ...form,
          documents: [],
          createdAt: now,
          updatedAt: now,
        };
        const updated = await addItem<Shipment>('shipments', newShipment);
        setShipments(updated);
      }
      closeModal();
    } catch (err) {
      setError(err instanceof StorageError ? err.message : 'Failed to save shipment');
    } finally {
      setLoading(false);
    }
  }, [form, editingId, closeModal]);

  const handleDelete = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await removeItem<Shipment>('shipments', id);
      setShipments(updated);
    } catch (err) {
      setError(err instanceof StorageError ? err.message : 'Failed to delete shipment');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateField = useCallback(
    <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const addProductToShipment = () => {
    if (!selectedProductId) return;
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    const existingIndex = form.products.findIndex((p) => p.productId === selectedProductId);
    const updatedProducts = [...form.products];

    if (existingIndex !== -1) {
      const targetProduct = updatedProducts[existingIndex];
      if (targetProduct) {
        targetProduct.quantity += selectedProductQty;
      }
    } else {
      updatedProducts.push({
        productId: prod.id,
        productName: prod.name,
        quantity: selectedProductQty,
      });
    }

    updateField('products', updatedProducts);
    setSelectedProductId('');
    setSelectedProductQty(1);
  };

  const removeProductFromShipment = (productId: string) => {
    const updatedProducts = form.products.filter((p) => p.productId !== productId);
    updateField('products', updatedProducts);
  };



  const cargoColumns: Column<ShipmentProduct>[] = [
    {
      key: 'productName',
      header: 'Product',
    },
    {
      key: 'quantity',
      header: 'Qty',
      render: (p) => p.quantity.toLocaleString(),
    },
    {
      key: 'actions',
      header: 'Action',
      render: (p) => (
        <button
          id={`btn-remove-cargo-${p.productId}`}
          className="btn btn-ghost btn-sm btn-icon"
          type="button"
          onClick={() => removeProductFromShipment(p.productId)}
        >
          ✕
        </button>
      ),
    },
  ];

  if (loading) return <Loading />;

  return (
    <div className="animate-fade-in">
      {error && <ErrorBanner message={error} />}
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-top">
          <h1>Shipments</h1>
          <button id="btn-new-shipment" className="btn btn-primary" onClick={openAdd}>
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            New Shipment
          </button>
        </div>
        <p>Track cargo status, logistics partners, and delivery pipelines globally.</p>
      </div>

      {/* Filter and Search */}
      <div className="card" style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-md)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
          <input
            id="input-shipments-search"
            className="form-input"
            type="text"
            placeholder="Search reference, route, carrier or tracking..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1 }}
          />
        </div>
      </div>

      {/* Shipments List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        {filtered.length > 0 ? (
          filtered.map((shipment) => {
            const currentStatusIndex = STATUS_FLOW.indexOf(shipment.status);

            return (
              <div key={shipment.id} className="card stagger-item" style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
                  <div>
                    <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--accent-blue)' }}>
                      Reference: {shipment.reference}
                    </h3>
                    <div style={{ display: 'flex', gap: 'var(--space-xl)', marginTop: 'var(--space-sm)', flexWrap: 'wrap' }}>
                      <div>
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Route:</span>
                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                          🌐 {shipment.origin} → {shipment.destination}
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Carrier:</span>
                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                          🚢 {shipment.carrier}
                        </div>
                      </div>
                      {shipment.trackingNumber && (
                        <div>
                          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Tracking:</span>
                          <div style={{ fontSize: 'var(--font-size-sm)' }}>
                            <code style={{ background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}>
                              {shipment.trackingNumber}
                            </code>
                          </div>
                        </div>
                      )}
                      <div>
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Est. Arrival:</span>
                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                          📅 {formatDate(shipment.estimatedArrival)}
                        </div>
                      </div>
                    </div>

                    {/* Products summary inside card */}
                    {shipment.products.length > 0 && (
                      <div style={{ marginTop: 'var(--space-md)', background: 'var(--bg-secondary)', padding: 'var(--space-sm) var(--space-md)', borderRadius: 'var(--radius-md)' }}>
                        <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--text-secondary)' }}>Cargo:</span>
                        <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', marginTop: '4px' }}>
                          {shipment.products.map((p, idx) => (
                            <span key={idx} style={{ fontSize: 'var(--font-size-xs)', background: 'var(--bg-surface)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                              {p.productName} ({p.quantity.toLocaleString()})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                    <button
                      id={`btn-edit-shipment-${shipment.id}`}
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => openEdit(shipment)}
                      title="Edit"
                    >
                      <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </button>
                    <button
                      id={`btn-delete-shipment-${shipment.id}`}
                      className="btn btn-danger btn-icon btn-sm"
                      onClick={() => { void handleDelete(shipment.id); }}
                      title="Delete"
                    >
                      <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                    </button>
                  </div>
                </div>

                {/* Pipeline visual status */}
                <div style={{ marginTop: 'var(--space-lg)', borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-md)' }}>
                  <div className="pipeline">
                    {STATUS_FLOW.map((statusName, idx) => {
                      const isActive = shipment.status === statusName;
                      const isCompleted = idx < currentStatusIndex;
                      let classStr = 'pipeline-step';
                      if (isActive) classStr += ' active';
                      if (isCompleted) classStr += ' completed';

                      return (
                        <div key={statusName} className={classStr}>
                          <div className="pipeline-dot" />
                          <span style={{ textTransform: 'capitalize' }}>{statusName.replace('-', ' ')}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty-state card">
            <svg viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            <h3>No shipments found</h3>
            <p>Begin tracking your shipping lines and cargo by creating a new shipment record.</p>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        id="shipment-modal"
        isOpen={showModal}
        onClose={closeModal}
        title={editingId ? 'Edit Shipment' : 'New Shipment'}
        footer={
          <>
            <button id="btn-cancel-shipment" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button
              id="btn-save-shipment"
              className="btn btn-primary"
              onClick={() => { void handleSubmit(); }}
              disabled={!form.reference.trim() || !form.estimatedArrival}
            >
              {editingId ? 'Update Shipment' : 'Create Shipment'}
            </button>
          </>
        }
      >
        <div className="form-row">
          <FormField id="input-shipment-ref" label="Reference Code" required>
            <input
              type="text"
              placeholder="e.g. SH-2026-001"
              value={form.reference}
              onChange={(e) => updateField('reference', e.target.value)}
            />
          </FormField>
          <FormField id="select-shipment-status" label="Status">
            <select
              value={form.status}
              onChange={(e) => updateField('status', e.target.value as ShipmentStatus)}
            >
              {STATUS_FLOW.map((st) => (
                <option key={st} value={st}>{st.charAt(0).toUpperCase() + st.slice(1)}</option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="form-row">
          <FormField id="select-shipment-origin" label="Origin Country">
            <select
              value={form.origin}
              onChange={(e) => updateField('origin', e.target.value)}
            >
              {COUNTRIES.map((country) => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </FormField>
          <FormField id="select-shipment-dest" label="Destination Country">
            <select
              value={form.destination}
              onChange={(e) => updateField('destination', e.target.value)}
            >
              {COUNTRIES.map((country) => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="form-row">
          <FormField id="select-shipment-carrier" label="Carrier">
            <select
              value={form.carrier}
              onChange={(e) => updateField('carrier', e.target.value)}
            >
              {CARRIERS.map((car) => (
                <option key={car} value={car}>{car}</option>
              ))}
            </select>
          </FormField>
          <FormField id="input-shipment-tracking" label="Tracking Number">
            <input
              type="text"
              placeholder="e.g. MSK987654321"
              value={form.trackingNumber}
              onChange={(e) => updateField('trackingNumber', e.target.value)}
            />
          </FormField>
        </div>

        <div className="form-row">
          <FormField id="input-shipment-eta" label="Estimated Arrival Date" required>
            <input
              type="date"
              value={form.estimatedArrival}
              onChange={(e) => updateField('estimatedArrival', e.target.value)}
            />
          </FormField>
        </div>

        {/* Product selector in shipment */}
        <div style={{ marginTop: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
          <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-sm)' }}>
            Cargo / Products in Shipment
          </h4>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
            <select
              id="select-shipment-product-add"
              className="form-select"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              style={{ flex: 2 }}
            >
              <option value="">-- Select Product to Add --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
              ))}
            </select>
            <input
              id="input-shipment-product-qty"
              className="form-input"
              type="number"
              min={1}
              value={selectedProductQty}
              onChange={(e) => setSelectedProductQty(parseInt(e.target.value) || 1)}
              style={{ flex: 1 }}
            />
            <button
              id="btn-add-cargo-product"
              className="btn btn-secondary"
              type="button"
              onClick={addProductToShipment}
              disabled={!selectedProductId}
            >
              Add
            </button>
          </div>

          {form.products.length > 0 ? (
            <div style={{ background: 'var(--bg-surface)' }}>
              <DataTable
                id="shipment-cargo-table"
                columns={cargoColumns}
                data={form.products}
                keyExtractor={(item) => item.productId}
              />
            </div>
          ) : (
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', textAlign: 'center' }}>
              No cargo added to this shipment yet.
            </p>
          )}
        </div>

        <FormField id="textarea-shipment-notes" label="Notes">
          <textarea
            placeholder="Port notes, customs remarks, special handling instructions..."
            value={form.notes}
            onChange={(e) => updateField('notes', e.target.value)}
          />
        </FormField>
      </Modal>
    </div>
  );
}
