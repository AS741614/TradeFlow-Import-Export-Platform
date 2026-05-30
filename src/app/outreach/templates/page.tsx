'use client';

import { useState, useCallback, useEffect } from 'react';
import { getItems, addItem, updateItem, removeItem } from '@/lib/storage';
import { generateId, nowISO } from '@/lib/utils';
import { EMAIL_TEMPLATE_PRESETS } from '@/lib/constants';
import { extractVariables, renderTemplate } from '@/lib/templateEngine';
import type { EmailTemplate, TemplateCategory } from '@/lib/types';
import { StorageError } from '@/lib/api-client';
import Loading from '@/components/Loading';
import ErrorBanner from '@/components/ErrorBanner';
import { Modal } from '@/components/ui/Modal';
import { FormField } from '@/components/ui/FormField';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        let stored = await getItems<EmailTemplate>('email-templates');
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
          for (const item of seeded) {
            await addItem<EmailTemplate>('email-templates', item);
          }
          stored = await getItems<EmailTemplate>('email-templates');
        }
        if (!cancelled) setTemplates(stored);
      } catch (err) {
        if (!cancelled) setError(err instanceof StorageError ? err.message : 'Failed to load email templates');
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

  const handleSubmit = useCallback(async () => {
    if (!form.name.trim() || !form.subject.trim() || !form.body.trim()) return;

    const combinedText = `${form.subject} ${form.body}`;
    const variables = extractVariables(combinedText);
    const now = nowISO();

    try {
      if (editingId) {
        const updated = await updateItem<EmailTemplate>('email-templates', editingId, {
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
        const updated = await addItem<EmailTemplate>('email-templates', newTemplate);
        setTemplates(updated);
      }
      closeModal();
    } catch (err) {
      setError(err instanceof StorageError ? err.message : 'Failed to save template');
    }
  }, [form, editingId, closeModal]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const updated = await removeItem<EmailTemplate>('email-templates', id);
      setTemplates(updated);
    } catch (err) {
      setError(err instanceof StorageError ? err.message : 'Failed to delete template');
    }
  }, []);

  const updateField = useCallback(
    <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

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

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <Loading />
      ) : (
        /* Templates Grid List */
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
                  onClick={() => { void handleDelete(t.id); }}
                  title="Delete Template"
                >
                  <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Large Edit / Create Template Modal */}
      <Modal
        id="template-modal"
        isOpen={showModal}
        onClose={closeModal}
        title={editingId ? 'Edit Template' : 'Compose Email Template'}
        className="modal-xl"
        footer={
          <>
            <button id="btn-cancel-template" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button
              id="btn-save-template"
              className="btn btn-primary"
              onClick={() => { void handleSubmit(); }}
              disabled={!form.name.trim() || !form.subject.trim() || !form.body.trim()}
            >
              {editingId ? 'Update Template' : 'Save Template'}
            </button>
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xl)' }}>
          
          {/* Left Column: Form Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {!editingId && (
              <FormField id="select-preset-loader" label="Load from System Presets">
                <select
                  onChange={(e) => handleLoadPreset(e.target.value)}
                  defaultValue=""
                >
                  <option value="">-- Click to Load Preset --</option>
                  {EMAIL_TEMPLATE_PRESETS.map((p, idx) => (
                    <option key={idx} value={idx}>{p.name}</option>
                  ))}
                </select>
              </FormField>
            )}

            <div className="form-row">
              <FormField id="input-template-name" label="Template Name" required>
                <input
                  type="text"
                  placeholder="e.g. Intro Pitch - Food Products"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                />
              </FormField>
              <FormField id="select-template-category" label="Category">
                <select
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
              </FormField>
            </div>

            <FormField id="input-template-subject" label="Subject Line * (Supports dynamic tokens)" required>
              <input
                type="text"
                placeholder="e.g. Partnership Opportunity — {{product_category}} for {{company}}"
                value={form.subject}
                onChange={(e) => updateField('subject', e.target.value)}
              />
            </FormField>

            <FormField id="textarea-template-body" label="Email Body * (HTML Supported)" required>
              <textarea
                placeholder="<p>Dear {{first_name}},</p>..."
                value={form.body}
                onChange={(e) => handleBodyChange(e.target.value)}
                style={{ minHeight: '260px', fontFamily: 'monospace', fontSize: 'var(--font-size-xs)' }}
              />
            </FormField>

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
      </Modal>
    </div>
  );
}
