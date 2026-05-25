'use client';

import { useEffect, useState, useCallback } from 'react';
import { getItems, addItem, updateItem, removeItem, STORAGE_KEYS } from '@/lib/storage';
import { generateId, nowISO } from '@/lib/utils';
import { EMAIL_TEMPLATE_PRESETS } from '@/lib/constants';
import { extractVariables, renderTemplate } from '@/lib/templateEngine';
import type { EmailTemplate, TemplateCategory } from '@/lib/types';

const EMPTY_FORM = {
  name: '',
  category: 'introduction' as TemplateCategory,
  subject: '',
  body: '',
};

// Fake contact for rendering live preview
const SAMPLE_CONTACT = {
  id: 'preview-id',
  firstName: 'Alexander',
  lastName: 'Hamilton',
  email: 'a.hamilton@treasury-imports.gov',
  company: 'Treasury Imports Corp.',
  phone: '+1-212-555-1789',
  country: 'United States',
  tags: ['prospect', 'import-buyer'],
  source: 'manual' as const,
  importedAt: nowISO(),
  campaignHistory: [],
};

const SAMPLE_CUSTOM_VARS = {
  sender_name: 'John Snow',
  company_name: 'Winterfell Trade Ltd.',
  product_category: 'Organic Textiles',
  origin_country: 'India',
  their_company: 'Treasury Imports Corp.',
  their_country: 'United States',
  min_order: '1000 Units',
  quote_date: 'May 20, 2026',
  validity_date: 'June 30, 2026',
  product_name: 'Organic Cotton Fabric Roll',
  order_number: 'TF-2026-987',
  carrier: 'Maersk Shipping Lines',
  tracking_number: 'MSK987654321',
  estimated_arrival: 'June 10, 2026',
};

export default function OutreachTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let stored = getItems<EmailTemplate>(STORAGE_KEYS.EMAIL_TEMPLATES);

    // Seed preset templates on first load
    if (stored.length === 0) {
      const seeded = EMAIL_TEMPLATE_PRESETS.map((preset) => {
        const combinedText = `${preset.subject} ${preset.body}`;
        const variables = extractVariables(combinedText);
        
        return {
          id: generateId(),
          name: preset.name,
          category: preset.category,
          subject: preset.subject,
          body: preset.body,
          variables,
          createdAt: nowISO(),
          updatedAt: nowISO(),
        };
      });
      seeded.forEach((t) => addItem(STORAGE_KEYS.EMAIL_TEMPLATES, t));
      stored = seeded;
    }

    setTimeout(() => {
      setTemplates(stored);
      setInitialized(true);
    }, 0);
  }, []);

  const openAdd = useCallback(() => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }, []);

  const openEdit = useCallback((template: EmailTemplate) => {
    setEditingId(template.id);
    setForm({
      name: template.name,
      category: template.category,
      subject: template.subject,
      body: template.body,
    });
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }, []);

  const handleLoadPreset = (indexStr: string) => {
    if (indexStr === '') return;
    const idx = parseInt(indexStr);
    const preset = EMAIL_TEMPLATE_PRESETS[idx];
    if (!preset) return;

    setForm({
      name: preset.name,
      category: preset.category,
      subject: preset.subject,
      body: preset.body,
    });
  };

  const handleBodyChange = (text: string) => {
    setForm((prev) => ({ ...prev, body: text }));
  };

  const handleSubmit = useCallback(() => {
    if (!form.name.trim() || !form.subject.trim() || !form.body.trim()) return;

    const combinedText = `${form.subject} ${form.body}`;
    const variables = extractVariables(combinedText);
    const now = nowISO();

    if (editingId) {
      const updated = updateItem<EmailTemplate>(STORAGE_KEYS.EMAIL_TEMPLATES, editingId, {
        ...form,
        variables,
        updatedAt: now,
      });
      setTemplates(updated);
    } else {
      const newTemplate: EmailTemplate = {
        id: generateId(),
        ...form,
        variables,
        createdAt: now,
        updatedAt: now,
      };
      const updated = addItem<EmailTemplate>(STORAGE_KEYS.EMAIL_TEMPLATES, newTemplate);
      setTemplates(updated);
    }
    closeModal();
  }, [form, editingId, closeModal]);

  const handleDelete = useCallback((id: string) => {
    const updated = removeItem<EmailTemplate>(STORAGE_KEYS.EMAIL_TEMPLATES, id);
    setTemplates(updated);
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
        <p>Loading email templates...</p>
      </div>
    );
  }

  // Pre-render Subject and Body previews
  const previewSubject = renderTemplate(form.subject, SAMPLE_CONTACT, SAMPLE_CUSTOM_VARS);
  const previewBody = renderTemplate(form.body, SAMPLE_CONTACT, SAMPLE_CUSTOM_VARS);
  const detectedVariables = extractVariables(`${form.subject} ${form.body}`);

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-top">
          <h1>Email Templates</h1>
          <button id="btn-create-template" className="btn btn-primary" onClick={openAdd}>
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Create Template
          </button>
        </div>
        <p>Manage and draft personalized HTML email templates with dynamic template tokens.</p>
      </div>

      {/* Templates Grid List */}
      <div className="grid-3" style={{ gap: 'var(--space-lg)' }}>
        {templates.map((t) => (
          <div key={t.id} className="card stagger-item" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '200px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-sm)' }}>
                <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)' }}>{t.name}</h3>
                <span className="badge status-info" style={{ textTransform: 'capitalize' }}>
                  {t.category}
                </span>
              </div>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>
                <strong>Subject:</strong> {t.subject}
              </p>
              
              {/* Dynamic Tokens List */}
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: 'var(--space-sm)' }}>
                {t.variables.map((v) => (
                  <span key={v} style={{ fontSize: '9px', background: 'var(--bg-secondary)', padding: '1px 5px', borderRadius: '4px', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                    {"{{" + v + "}}"}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-xs)', borderTop: '1px solid var(--border-subtle)', marginTop: 'var(--space-md)', paddingTop: 'var(--space-sm)' }}>
              <button
                id={`btn-edit-template-${t.id}`}
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => openEdit(t)}
                title="Edit Template"
              >
                <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
              </button>
              <button
                id={`btn-delete-template-${t.id}`}
                className="btn btn-danger btn-sm btn-icon"
                onClick={() => handleDelete(t.id)}
                title="Delete Template"
              >
                <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Large Edit / Create Template Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal-xl" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Edit Template' : 'Compose Email Template'}</h2>
              <button id="btn-close-template-modal" className="btn btn-ghost btn-icon btn-sm" onClick={closeModal}>
                <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xl)' }}>
              
              {/* Left Column: Form Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {!editingId && (
                  <div className="form-group">
                    <label className="form-label" htmlFor="select-preset-loader">Load from System Presets</label>
                    <select
                      id="select-preset-loader"
                      className="form-select"
                      onChange={(e) => handleLoadPreset(e.target.value)}
                      defaultValue=""
                    >
                      <option value="">-- Click to Load Preset --</option>
                      {EMAIL_TEMPLATE_PRESETS.map((p, idx) => (
                        <option key={idx} value={idx}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="input-template-name">Template Name *</label>
                    <input
                      id="input-template-name"
                      className="form-input"
                      type="text"
                      placeholder="e.g. Intro Pitch - Food Products"
                      value={form.name}
                      onChange={(e) => updateField('name', e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="select-template-category">Category</label>
                    <select
                      id="select-template-category"
                      className="form-select"
                      value={form.category}
                      onChange={(e) => updateField('category', e.target.value as TemplateCategory)}
                    >
                      <option value="introduction">Introduction / Cold Outreach</option>
                      <option value="catalog">Product Catalog</option>
                      <option value="quotation">Quotation / Follow Up</option>
                      <option value="follow-up">Follow Up</option>
                      <option value="re-engagement">Re-engagement</option>
                      <option value="notification">Notification</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="input-template-subject">Subject Line * (Supports dynamic tokens)</label>
                  <input
                    id="input-template-subject"
                    className="form-input"
                    type="text"
                    placeholder="e.g. Partnership Opportunity — {{product_category}} for {{company}}"
                    value={form.subject}
                    onChange={(e) => updateField('subject', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="textarea-template-body">Email Body * (HTML Supported)</label>
                  <textarea
                    id="textarea-template-body"
                    className="form-textarea"
                    placeholder="<p>Dear {{first_name}},</p>..."
                    value={form.body}
                    onChange={(e) => handleBodyChange(e.target.value)}
                    style={{ minHeight: '260px', fontFamily: 'monospace', fontSize: 'var(--font-size-xs)' }}
                  />
                </div>

                {detectedVariables.length > 0 && (
                  <div>
                    <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--text-secondary)' }}>Detected Merge Variables:</span>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                      {detectedVariables.map((v) => (
                        <span key={v} style={{ fontSize: '9px', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-subtle)', color: 'var(--accent-blue)' }}>
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Live Rendered Preview */}
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <span className="form-label">Live Preview (Demo Client Mode)</span>
                <div className="card" style={{ flex: 1, background: 'var(--bg-secondary)', border: '1px solid var(--border-strong)', padding: 'var(--space-md)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--space-sm)', marginBottom: 'var(--space-md)', fontSize: 'var(--font-size-sm)' }}>
                    <div><strong>To:</strong> Alexander Hamilton &lt;a.hamilton@treasury-imports.gov&gt;</div>
                    <div style={{ marginTop: '4px' }}><strong>Subject:</strong> {previewSubject || '(Empty Subject)'}</div>
                  </div>
                  
                  {/* Body Preview */}
                  <div
                    style={{ fontSize: 'var(--font-size-sm)', lineHeight: '1.6', flex: 1, whiteSpace: 'normal', color: 'var(--text-primary)' }}
                    dangerouslySetInnerHTML={{ __html: previewBody || '<p style="color: var(--text-tertiary)">Write email body on the left to show preview.</p>' }}
                  />
                </div>
              </div>

            </div>

            <div className="modal-footer">
              <button id="btn-cancel-template" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button
                id="btn-save-template"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={!form.name.trim() || !form.subject.trim() || !form.body.trim()}
              >
                {editingId ? 'Update Template' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
