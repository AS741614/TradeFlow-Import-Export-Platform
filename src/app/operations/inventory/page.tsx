'use client';

import { useState, useCallback, useEffect } from 'react';
import { getItems, addItem, updateItem, removeItem } from '@/lib/storage';
import { generateId, formatCurrency, getStatusColor, nowISO } from '@/lib/utils';
import { PRODUCT_CATEGORIES, COUNTRIES, CURRENCIES, DEFAULT_PRODUCT_CATEGORY, DEFAULT_COUNTRY } from '@/lib/constants';
import type { Product } from '@/lib/types';
import { StorageError } from '@/lib/api-client';
import Loading from '@/components/Loading';
import ErrorBanner from '@/components/ErrorBanner';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { FormField } from '@/components/ui/FormField';

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
  category: DEFAULT_PRODUCT_CATEGORY,
  quantity: 0,
  reorderLevel: 10,
  unitCost: 0,
  currency: 'USD',
  supplier: '',
  origin: DEFAULT_COUNTRY,
};

// ---- Component ----

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await getItems<Product>('products');
        if (!cancelled) setProducts(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof StorageError ? err.message : 'Failed to load products');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
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

  const handleSubmit = useCallback(async () => {
    if (!form.name.trim() || !form.sku.trim()) return;

    const status = calcStatus(form.quantity, form.reorderLevel);
    const now = nowISO();

    try {
      if (editingId) {
        const updated = await updateItem<Product>('products', editingId, {
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
        const updated = await addItem<Product>('products', newProduct);
        setProducts(updated);
      }
      closeModal();
    } catch (err) {
      setError(err instanceof StorageError ? err.message : 'Failed to save product');
    }
  }, [form, editingId, closeModal]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const updated = await removeItem<Product>('products', id);
      setProducts(updated);
    } catch (err) {
      setError(err instanceof StorageError ? err.message : 'Failed to delete product');
    }
  }, []);

  const updateField = useCallback(
    <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const columns: Column<Product>[] = [
    {
      key: 'name',
      header: 'Name',
      cellClassName: 'font-semibold',
    },
    {
      key: 'sku',
      header: 'SKU',
      render: (product) => (
        <code style={{ fontSize: 'var(--font-size-xs)', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}>
          {product.sku}
        </code>
      ),
    },
    {
      key: 'hsCode',
      header: 'HS Code',
    },
    {
      key: 'category',
      header: 'Category',
    },
    {
      key: 'quantity',
      header: 'Qty',
      render: (product) => product.quantity.toLocaleString(),
    },
    {
      key: 'unitCost',
      header: 'Unit Cost',
      render: (product) => formatCurrency(product.unitCost, product.currency),
    },
    {
      key: 'status',
      header: 'Status',
      render: (product) => (
        <span className={`badge ${getStatusColor(product.status)}`}>
          {product.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (product) => (
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
            onClick={() => { void handleDelete(product.id); }}
            title="Delete"
          >
            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
          </button>
        </div>
      ),
    },
  ];

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

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <Loading />
      ) : (
        /* Data Table */
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

          <DataTable
            id="inventory-table"
            columns={columns}
            data={filtered}
            keyExtractor={(item) => item.id}
            emptyState={
              <div className="data-table-empty">
                <svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
                <p>No products found. Add your first product to get started.</p>
              </div>
            }
          />
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        id="product-modal"
        isOpen={showModal}
        onClose={closeModal}
        title={editingId ? 'Edit Product' : 'Add Product'}
        footer={
          <>
            <button id="btn-cancel-product" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button
              id="btn-save-product"
              className="btn btn-primary"
              onClick={() => { void handleSubmit(); }}
              disabled={!form.name.trim() || !form.sku.trim()}
            >
              {editingId ? 'Update Product' : 'Add Product'}
            </button>
          </>
        }
      >
        <div className="form-row">
          <FormField id="input-product-name" label="Product Name" required>
            <input
              type="text"
              placeholder="e.g. Organic Cotton Fabric"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
            />
          </FormField>
          <FormField id="input-product-sku" label="SKU" required>
            <input
              type="text"
              placeholder="e.g. TEX-001"
              value={form.sku}
              onChange={(e) => updateField('sku', e.target.value)}
            />
          </FormField>
        </div>

        <div className="form-row">
          <FormField id="input-product-hsCode" label="HS Code">
            <input
              type="text"
              placeholder="e.g. 5208.12"
              value={form.hsCode}
              onChange={(e) => updateField('hsCode', e.target.value)}
            />
          </FormField>
          <FormField id="select-product-category" label="Category">
            <select
              value={form.category}
              onChange={(e) => updateField('category', e.target.value)}
            >
              {PRODUCT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="form-row">
          <FormField id="input-product-quantity" label="Quantity">
            <input
              type="number"
              min={0}
              value={form.quantity}
              onChange={(e) => updateField('quantity', parseInt(e.target.value) || 0)}
            />
          </FormField>
          <FormField id="input-product-reorderLevel" label="Reorder Level">
            <input
              type="number"
              min={0}
              value={form.reorderLevel}
              onChange={(e) => updateField('reorderLevel', parseInt(e.target.value) || 0)}
            />
          </FormField>
        </div>

        <div className="form-row">
          <FormField id="input-product-unitCost" label="Unit Cost">
            <input
              type="number"
              min={0}
              step={0.01}
              value={form.unitCost}
              onChange={(e) => updateField('unitCost', parseFloat(e.target.value) || 0)}
            />
          </FormField>
          <FormField id="select-product-currency" label="Currency">
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
          <FormField id="input-product-supplier" label="Supplier">
            <input
              type="text"
              placeholder="e.g. Mumbai Textiles Co."
              value={form.supplier}
              onChange={(e) => updateField('supplier', e.target.value)}
            />
          </FormField>
          <FormField id="select-product-origin" label="Origin Country">
            <select
              value={form.origin}
              onChange={(e) => updateField('origin', e.target.value)}
            >
              {COUNTRIES.map((country) => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </FormField>
        </div>
      </Modal>
    </div>
  );
}
