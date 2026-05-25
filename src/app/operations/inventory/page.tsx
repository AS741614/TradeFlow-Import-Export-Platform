'use client';

import { useEffect, useState, useCallback } from 'react';
import { getItems, addItem, updateItem, removeItem, STORAGE_KEYS } from '@/lib/storage';
import { generateId, formatCurrency, getStatusColor, nowISO } from '@/lib/utils';
import { PRODUCT_CATEGORIES, COUNTRIES, CURRENCIES } from '@/lib/constants';
import type { Product } from '@/lib/types';

// ---- Helpers ----

function calcStatus(quantity: number, reorderLevel: number): Product['status'] {
  if (quantity <= 0) return 'out-of-stock';
  if (quantity <= reorderLevel) return 'low-stock';
  return 'in-stock';
}

const EMPTY_FORM: Omit<Product, 'id' | 'status' | 'createdAt' | 'updatedAt'> = {
  name: '',
  sku: '',
  hsCode: '',
  category: PRODUCT_CATEGORIES[0] ?? '', // strict-ts-deferred: assert at constants source in later prompt
  quantity: 0,
  reorderLevel: 10,
  unitCost: 0,
  currency: 'USD',
  supplier: '',
  origin: COUNTRIES[0] ?? '', // strict-ts-deferred: assert at constants source in later prompt
};

// ---- Component ----

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [initialized, setInitialized] = useState(false);

  // Load data from localStorage
  useEffect(() => {
    const data = getItems<Product>(STORAGE_KEYS.PRODUCTS);
    setTimeout(() => {
      setProducts(data);
      setInitialized(true);
    }, 0);
  }, []);

  // Filtered products based on search
  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.hsCode.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.supplier.toLowerCase().includes(q)
    );
  });

  // ---- Modal handlers ----

  const openAdd = useCallback(() => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }, []);

  const openEdit = useCallback((product: Product) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      sku: product.sku,
      hsCode: product.hsCode,
      category: product.category,
      quantity: product.quantity,
      reorderLevel: product.reorderLevel,
      unitCost: product.unitCost,
      currency: product.currency,
      supplier: product.supplier,
      origin: product.origin,
    });
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!form.name.trim() || !form.sku.trim()) return;

    const status = calcStatus(form.quantity, form.reorderLevel);
    const now = nowISO();

    if (editingId) {
      const updated = updateItem<Product>(STORAGE_KEYS.PRODUCTS, editingId, {
        ...form,
        status,
        updatedAt: now,
      });
      setProducts(updated);
    } else {
      const newProduct: Product = {
        id: generateId(),
        ...form,
        status,
        createdAt: now,
        updatedAt: now,
      };
      const updated = addItem<Product>(STORAGE_KEYS.PRODUCTS, newProduct);
      setProducts(updated);
    }
    closeModal();
  }, [form, editingId, closeModal]);

  const handleDelete = useCallback((id: string) => {
    const updated = removeItem<Product>(STORAGE_KEYS.PRODUCTS, id);
    setProducts(updated);
  }, []);

  const updateField = useCallback(
    <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  if (!initialized) {
    return (
      <div className="empty-state">
        <p>Loading inventory...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-top">
          <h1>Inventory</h1>
          <button id="btn-add-product" className="btn btn-primary" onClick={openAdd}>
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add Product
          </button>
        </div>
        <p>Manage your product catalog, stock levels, and sourcing details.</p>
      </div>

      {/* Data Table */}
      <div className="data-table-wrapper">
        <div className="data-table-header">
          <h3>{filtered.length} Product{filtered.length !== 1 ? 's' : ''}</h3>
          <div className="data-table-actions">
            <input
              id="input-inventory-search"
              className="form-input"
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 260, height: 36 }}
            />
          </div>
        </div>

        {filtered.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>SKU</th>
                <th>HS Code</th>
                <th>Category</th>
                <th>Qty</th>
                <th>Unit Cost</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => (
                <tr key={product.id} className="stagger-item">
                  <td style={{ fontWeight: 'var(--font-weight-medium)' }}>{product.name}</td>
                  <td><code style={{ fontSize: 'var(--font-size-xs)', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}>{product.sku}</code></td>
                  <td>{product.hsCode}</td>
                  <td>{product.category}</td>
                  <td>{product.quantity.toLocaleString()}</td>
                  <td>{formatCurrency(product.unitCost, product.currency)}</td>
                  <td>
                    <span className={`badge ${getStatusColor(product.status)}`}>
                      {product.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                      <button
                        id={`btn-edit-product-${product.id}`}
                        className="btn btn-ghost btn-sm btn-icon"
                        onClick={() => openEdit(product)}
                        title="Edit"
                      >
                        <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </button>
                      <button
                        id={`btn-delete-product-${product.id}`}
                        className="btn btn-danger btn-sm btn-icon"
                        onClick={() => handleDelete(product.id)}
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
            <svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
            <p>No products found. Add your first product to get started.</p>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Edit Product' : 'Add Product'}</h2>
              <button id="btn-close-product-modal" className="btn btn-ghost btn-icon btn-sm" onClick={closeModal}>
                <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="input-product-name">Product Name *</label>
                  <input
                    id="input-product-name"
                    className="form-input"
                    type="text"
                    placeholder="e.g. Organic Cotton Fabric"
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="input-product-sku">SKU *</label>
                  <input
                    id="input-product-sku"
                    className="form-input"
                    type="text"
                    placeholder="e.g. TEX-001"
                    value={form.sku}
                    onChange={(e) => updateField('sku', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="input-product-hsCode">HS Code</label>
                  <input
                    id="input-product-hsCode"
                    className="form-input"
                    type="text"
                    placeholder="e.g. 5208.12"
                    value={form.hsCode}
                    onChange={(e) => updateField('hsCode', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="select-product-category">Category</label>
                  <select
                    id="select-product-category"
                    className="form-select"
                    value={form.category}
                    onChange={(e) => updateField('category', e.target.value)}
                  >
                    {PRODUCT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="input-product-quantity">Quantity</label>
                  <input
                    id="input-product-quantity"
                    className="form-input"
                    type="number"
                    min={0}
                    value={form.quantity}
                    onChange={(e) => updateField('quantity', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="input-product-reorderLevel">Reorder Level</label>
                  <input
                    id="input-product-reorderLevel"
                    className="form-input"
                    type="number"
                    min={0}
                    value={form.reorderLevel}
                    onChange={(e) => updateField('reorderLevel', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="input-product-unitCost">Unit Cost</label>
                  <input
                    id="input-product-unitCost"
                    className="form-input"
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.unitCost}
                    onChange={(e) => updateField('unitCost', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="select-product-currency">Currency</label>
                  <select
                    id="select-product-currency"
                    className="form-select"
                    value={form.currency}
                    onChange={(e) => updateField('currency', e.target.value)}
                  >
                    {CURRENCIES.map((cur) => (
                      <option key={cur.code} value={cur.code}>{cur.code} — {cur.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="input-product-supplier">Supplier</label>
                  <input
                    id="input-product-supplier"
                    className="form-input"
                    type="text"
                    placeholder="e.g. Mumbai Textiles Co."
                    value={form.supplier}
                    onChange={(e) => updateField('supplier', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="select-product-origin">Origin Country</label>
                  <select
                    id="select-product-origin"
                    className="form-select"
                    value={form.origin}
                    onChange={(e) => updateField('origin', e.target.value)}
                  >
                    {COUNTRIES.map((country) => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button id="btn-cancel-product" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button
                id="btn-save-product"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={!form.name.trim() || !form.sku.trim()}
              >
                {editingId ? 'Update Product' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
