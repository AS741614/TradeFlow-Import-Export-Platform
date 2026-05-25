'use client';

import { useEffect, useState, useRef } from 'react';
import { getItems, addItem, removeItem, STORAGE_KEYS } from '@/lib/storage';
import { generateId, nowISO, isValidEmail } from '@/lib/utils';
import { COUNTRIES } from '@/lib/constants';
import { parseCSV, mapParsedDataToContacts, parseJSONContacts } from '@/lib/importers';
import type { OutreachContact } from '@/lib/types';

const EMPTY_MANUAL_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  company: '',
  phone: '',
  country: COUNTRIES[0] ?? 'United States', // strict-ts-deferred: assert at constants source in later prompt
  tags: '',
};

export default function OutreachContactsPage() {
  const [contacts, setContacts] = useState<OutreachContact[]>([]);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('all');
  const [initialized, setInitialized] = useState(false);

  // Selection states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal states
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState(EMPTY_MANUAL_FORM);

  // Drag and Drop upload states
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mapping states
  const [importPhase, setImportPhase] = useState<'idle' | 'mapping'>('idle');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<Record<string, number>>({
    firstName: 0,
    lastName: 1,
    email: 2,
    company: 3,
    phone: 4,
    country: 5,
  });

  useEffect(() => {
    const loadedContacts = getItems<OutreachContact>(STORAGE_KEYS.OUTREACH_CONTACTS);
    setTimeout(() => {
      setContacts(loadedContacts);
      setInitialized(true);
    }, 0);
  }, []);

  // Filter contacts
  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q) ||
      c.country.toLowerCase().includes(q);

    const matchesTag = tagFilter === 'all' || c.tags.includes(tagFilter);

    return matchesSearch && matchesTag;
  });

  // Extract all unique tags
  const allTags = Array.from(new Set(contacts.flatMap((c) => c.tags)));

  // Drag handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // Upload handler
  const processUploadedFile = (file: File) => {
    const reader = new FileReader();
    const isJson = file.type === 'application/json' || file.name.endsWith('.json');

    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      if (isJson) {
        const parsed = parseJSONContacts(text);
        if (parsed.length > 0) {
          const updated = [...contacts];
          parsed.forEach((c) => {
            if (!updated.some((item) => item.email === c.email)) {
              updated.push(c);
              addItem(STORAGE_KEYS.OUTREACH_CONTACTS, c);
            }
          });
          setContacts(updated);
          alert(`Successfully imported ${String(parsed.length)} contacts from JSON!`);
        } else {
          alert('Could not parse any valid contacts from the JSON file.');
        }
      } else {
        // CSV Parsing
        const rawCSV = parseCSV(text);
        if (rawCSV.length < 2) {
          alert('CSV file must contain a header row and at least one contact.');
          return;
        }

        const headers = rawCSV[0];
        const rows = rawCSV.slice(1);

        if (!headers) {
          alert('CSV file must contain a header row and at least one contact.');
          return;
        }

        setCsvHeaders(headers);
        setCsvRows(rows);

        // Guess initial column mappings based on headers
        const initialMappings: Record<string, number> = {
          firstName: headers.findIndex((h) => /first|name/i.test(h) && !/last/i.test(h)),
          lastName: headers.findIndex((h) => /last/i.test(h)),
          email: headers.findIndex((h) => /email|mail/i.test(h)),
          company: headers.findIndex((h) => /company|firm|org/i.test(h)),
          phone: headers.findIndex((h) => /phone|mobile|tel/i.test(h)),
          country: headers.findIndex((h) => /country|nation/i.test(h)),
        };

        // Fallbacks if not found
        Object.keys(initialMappings).forEach((k) => {
          if (initialMappings[k] === -1) {
            initialMappings[k] = 0;
          }
        });

        setMappings(initialMappings);
        setImportPhase('mapping');
      }
    };

    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files[0]) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      processUploadedFile(e.target.files[0]);
    }
  };

  const handleFinalizeImport = () => {
    const imported = mapParsedDataToContacts(csvHeaders, csvRows, mappings, 'csv');
    if (imported.length > 0) {
      const updated = [...contacts];
      imported.forEach((c) => {
        if (!updated.some((item) => item.email === c.email)) {
          updated.push(c);
          addItem(STORAGE_KEYS.OUTREACH_CONTACTS, c);
        }
      });
      setContacts(updated);
      alert(`Imported ${String(imported.length)} contacts!`);
    } else {
      alert('No contacts were imported. Please check your mapping columns and email validity.');
    }
    setImportPhase('idle');
  };

  // Manual Contact Handlers
  const handleAddManual = () => {
    const { firstName, lastName, email, company, phone, country, tags } = manualForm;
    if (!email || !isValidEmail(email) || !firstName || !company) {
      alert('First name, company name, and a valid email are required.');
      return;
    }

    const cleanTags = tags
      ? tags.split(',').map((t) => t.trim()).filter(Boolean)
      : ['manual'];

    const newContact: OutreachContact = {
      id: generateId(),
      firstName,
      lastName,
      email: email.toLowerCase(),
      company,
      phone: phone || undefined,
      country,
      tags: cleanTags,
      source: 'manual',
      importedAt: nowISO(),
      campaignHistory: [],
    };

    const updated = addItem<OutreachContact>(STORAGE_KEYS.OUTREACH_CONTACTS, newContact);
    setContacts(updated);
    setShowManualModal(false);
    setManualForm(EMPTY_MANUAL_FORM);
  };

  // Bulk actions
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filtered.map((c) => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Are you sure you want to delete ${String(selectedIds.length)} selected contacts?`)) {
      let updated = [...contacts];
      selectedIds.forEach((id) => {
        updated = removeItem<OutreachContact>(STORAGE_KEYS.OUTREACH_CONTACTS, id);
      });
      setContacts(updated);
      setSelectedIds([]);
    }
  };

  if (!initialized) {
    return (
      <div className="empty-state">
        <p>Loading directory...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-top">
          <h1>Outreach Contacts</h1>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <button id="btn-import-contacts-trigger" className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
              📂 Upload CSV / JSON
            </button>
            <button id="btn-add-manual-contact" className="btn btn-primary" onClick={() => setShowManualModal(true)}>
              ➕ Add Manual Contact
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInput}
              accept=".csv,.json"
              style={{ display: 'none' }}
            />
          </div>
        </div>
        <p>Import and filter target buyers, distributors, and sourcing managers for email outreach campaigns.</p>
      </div>

      {/* Dynamic Column Mapping UI */}
      {importPhase === 'mapping' && (
        <div className="card animate-slide-down" style={{ marginBottom: 'var(--space-xl)', borderColor: 'var(--accent-blue)' }}>
          <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--accent-blue)', marginBottom: 'var(--space-md)' }}>
            ⚙️ Map CSV Columns to Contact Attributes
          </h3>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
            We detected these columns in your CSV. Select which column corresponds to each field below:
          </p>

          <div className="grid-3" style={{ gap: 'var(--space-md)' }}>
            {['firstName', 'lastName', 'email', 'company', 'phone', 'country'].map((field) => (
              <div key={field} className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ textTransform: 'capitalize' }}>{field.replace(/([A-Z])/g, ' $1')}</label>
                <select
                  id={`select-map-field-${field}`}
                  className="form-select"
                  value={mappings[field]}
                  onChange={(e) => setMappings({ ...mappings, [field]: parseInt(e.target.value) })}
                >
                  {csvHeaders.map((header, idx) => (
                    <option key={idx} value={idx}>{header} (col {idx + 1})</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            <button id="btn-cancel-mapping" className="btn btn-secondary" onClick={() => setImportPhase('idle')}>Cancel</button>
            <button id="btn-confirm-mapping" className="btn btn-primary" onClick={handleFinalizeImport}>Import {csvRows.length} Contacts</button>
          </div>
        </div>
      )}

      {/* Drop Zone (Hidden if mapping is active) */}
      {importPhase === 'idle' && contacts.length === 0 && (
        <div
          id="drop-zone-contacts"
          className={`drop-zone ${dragActive ? 'drag-over' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{ marginBottom: 'var(--space-xl)' }}
        >
          <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <p>
            Drag & drop your <span className="drop-zone-highlight">CSV or JSON</span> contact file here, or click to browse.
          </p>
          <p style={{ fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-xs)', color: 'var(--text-tertiary)' }}>
            Headers should ideally include: First Name, Last Name, Email, Company, Country
          </p>
        </div>
      )}

      {/* Filters Hub & Search */}
      <div className="card" style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-md)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 'var(--space-md)', flex: 1, minWidth: '300px' }}>
            <input
              id="input-outreach-contacts-search"
              className="form-input"
              type="text"
              placeholder="Search contact database..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 2 }}
            />
            <select
              id="select-filter-outreach-tag"
              className="form-select"
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              style={{ flex: 1 }}
            >
              <option value="all">All Tags</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>

          {selectedIds.length > 0 && (
            <button id="btn-bulk-delete-contacts" className="btn btn-danger" onClick={handleBulkDelete}>
              🗑️ Delete Selected ({selectedIds.length})
            </button>
          )}
        </div>
      </div>

      {/* Directory Table */}
      <div className="data-table-wrapper">
        <div className="data-table-header">
          <h3>{filtered.length} Registered Outreach Contact{filtered.length !== 1 ? 's' : ''}</h3>
        </div>

        {filtered.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input
                    id="checkbox-select-all"
                    type="checkbox"
                    checked={filtered.length > 0 && selectedIds.length === filtered.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
                <th>Name</th>
                <th>Email</th>
                <th>Company</th>
                <th>Country</th>
                <th>Source</th>
                <th>Tags</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="stagger-item">
                  <td>
                    <input
                      id={`checkbox-select-${c.id}`}
                      type="checkbox"
                      checked={selectedIds.includes(c.id)}
                      onChange={(e) => handleSelectOne(c.id, e.target.checked)}
                    />
                  </td>
                  <td style={{ fontWeight: 'var(--font-weight-medium)' }}>{c.firstName} {c.lastName}</td>
                  <td>{c.email}</td>
                  <td>{c.company}</td>
                  <td>{c.country}</td>
                  <td>
                    <span style={{ fontSize: 'var(--font-size-xs)', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: 'var(--radius-sm)', textTransform: 'uppercase' }}>
                      {c.source}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {c.tags.map((t, idx) => (
                        <span key={idx} className="tag tag-blue">
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="data-table-empty">
            <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            <p>No outreach contacts in database. Import files or add manually to trigger campaigns.</p>
          </div>
        )}
      </div>

      {/* Manual Contact Modal */}
      {showManualModal && (
        <div className="modal-overlay" onClick={() => setShowManualModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Outreach Contact</h2>
              <button id="btn-close-manual-modal" className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowManualModal(false)}>
                <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="input-manual-first">First Name *</label>
                  <input
                    id="input-manual-first"
                    className="form-input"
                    type="text"
                    placeholder="e.g. Jean"
                    value={manualForm.firstName}
                    onChange={(e) => setManualForm({ ...manualForm, firstName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="input-manual-last">Last Name</label>
                  <input
                    id="input-manual-last"
                    className="form-input"
                    type="text"
                    placeholder="e.g. Dupont"
                    value={manualForm.lastName}
                    onChange={(e) => setManualForm({ ...manualForm, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="input-manual-email">Email Address *</label>
                  <input
                    id="input-manual-email"
                    className="form-input"
                    type="email"
                    placeholder="e.g. j.dupont@company.com"
                    value={manualForm.email}
                    onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="input-manual-company">Company Name *</label>
                  <input
                    id="input-manual-company"
                    className="form-input"
                    type="text"
                    placeholder="e.g. Global Distributing SA"
                    value={manualForm.company}
                    onChange={(e) => setManualForm({ ...manualForm, company: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="select-manual-country">Country</label>
                  <select
                    id="select-manual-country"
                    className="form-select"
                    value={manualForm.country}
                    onChange={(e) => setManualForm({ ...manualForm, country: e.target.value })}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="input-manual-tags">Tags (Comma-separated)</label>
                  <input
                    id="input-manual-tags"
                    className="form-input"
                    type="text"
                    placeholder="e.g. buyer, wholesale, priority"
                    value={manualForm.tags}
                    onChange={(e) => setManualForm({ ...manualForm, tags: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="input-manual-phone">Phone Number</label>
                <input
                  id="input-manual-phone"
                  className="form-input"
                  type="text"
                  placeholder="e.g. +33-1-2345678"
                  value={manualForm.phone}
                  onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button id="btn-cancel-manual" className="btn btn-secondary" onClick={() => setShowManualModal(false)}>Cancel</button>
              <button
                id="btn-save-manual"
                className="btn btn-primary"
                onClick={handleAddManual}
                disabled={!manualForm.email.trim() || !manualForm.firstName.trim() || !manualForm.company.trim()}
              >
                Save Contact
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
