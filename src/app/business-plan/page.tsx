'use client';

import { useState, useEffect } from 'react';
import { getItems, addItem, updateItem, removeItem } from '@/lib/storage';
import { generateId, formatDate, nowISO } from '@/lib/utils';
import { getDefaultBusinessPlan, getDefaultSwotItems } from '@/lib/constants';
import type { BusinessPlanSection, SwotItem } from '@/lib/types';
import { StorageError } from '@/lib/api-client';
import Loading from '@/components/Loading';
import ErrorBanner from '@/components/ErrorBanner';

export default function BusinessPlanPage() {
  const [sections, setSections] = useState<BusinessPlanSection[]>([]);
  const [swotItems, setSwotItems] = useState<SwotItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [lastSaved, setLastSaved] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New SWOT item inputs for each quadrant
  const [newStrength, setNewStrength] = useState('');
  const [newWeakness, setNewWeakness] = useState('');
  const [newOpportunity, setNewOpportunity] = useState('');
  const [newThreat, setNewThreat] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        let loadedSections = await getItems<BusinessPlanSection>('business-plan');
        if (loadedSections.length === 0) {
          const defaults = getDefaultBusinessPlan();
          const seeded: BusinessPlanSection[] = [];
          for (const item of defaults) {
            const added = await addItem<BusinessPlanSection>('business-plan', item);
            seeded.splice(0, seeded.length, ...added);
          }
          loadedSections = seeded;
        }

        let loadedSwot = await getItems<SwotItem>('swot');
        if (loadedSwot.length === 0) {
          const defaults = getDefaultSwotItems();
          const seededSwot: SwotItem[] = [];
          for (const item of defaults) {
            const added = await addItem<SwotItem>('swot', item);
            seededSwot.splice(0, seededSwot.length, ...added);
          }
          loadedSwot = seededSwot;
        }

        if (!cancelled) {
          const sorted = loadedSections.sort((a, b) => a.order - b.order);
          setSections(sorted);
          setSwotItems(loadedSwot);
          setActiveTab(sorted[0]?.id ?? '');
          setLastSaved(nowISO());
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof StorageError ? err.message : 'Failed to load business plan');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSectionTextChange = async (sectionId: string, newText: string) => {
    setError(null);
    try {
      const fresh = await updateItem<BusinessPlanSection>('business-plan', sectionId, { content: newText });
      setSections(fresh.sort((a, b) => a.order - b.order));
      setLastSaved(nowISO());
    } catch (err) {
      setError(err instanceof StorageError ? err.message : 'Failed to save document section');
    }
  };

  const handleAddSwotItem = async (text: string, category: SwotItem['category']) => {
    if (!text.trim()) return;
    const newItem: SwotItem = {
      id: generateId(),
      text: text.trim(),
      category,
    };

    setError(null);
    try {
      const fresh = await addItem<SwotItem>('swot', newItem);
      setSwotItems(fresh);
      setLastSaved(nowISO());

      // Clear input
      if (category === 'strength') setNewStrength('');
      if (category === 'weakness') setNewWeakness('');
      if (category === 'opportunity') setNewOpportunity('');
      if (category === 'threat') setNewThreat('');
    } catch (err) {
      setError(err instanceof StorageError ? err.message : 'Failed to add SWOT item');
    }
  };

  const handleDeleteSwotItem = async (id: string) => {
    setError(null);
    try {
      const fresh = await removeItem<SwotItem>('swot', id);
      setSwotItems(fresh);
      setLastSaved(nowISO());
    } catch (err) {
      setError(err instanceof StorageError ? err.message : 'Failed to delete SWOT item');
    }
  };



  const currentSection = sections.find((s) => s.id === activeTab);

  // Completion calculation (e.g. how many sections are not default/empty or simple length checks)
  const totalSections = sections.length;
  const sectionsCompleted = sections.filter((s) => s.content.trim().length > 20).length;
  const swotCount = swotItems.length;
  const completionPercentage = Math.round(((sectionsCompleted) / totalSections) * 100);

  if (loading) return <Loading />;

  return (
    <div className="animate-fade-in">
      {error && <ErrorBanner message={error} />}
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-top">
          <h1>Business Plan & Strategy</h1>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 'var(--radius-full)' }}>
            Saved: {formatDate(lastSaved)}
          </div>
        </div>
        <p>Draft your export strategy, perform SWOT audits, and outline project KPIs directly on-platform.</p>
      </div>

      {/* Strategic KPIs */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="metric-card blue stagger-item">
          <div className="metric-card-content">
            <div className="metric-card-label">Total Sections</div>
            <div className="metric-card-value">{totalSections}</div>
          </div>
        </div>
        <div className="metric-card emerald stagger-item">
          <div className="metric-card-content">
            <div className="metric-card-label">Completion Status</div>
            <div className="metric-card-value">{completionPercentage}%</div>
          </div>
        </div>
        <div className="metric-card amber stagger-item">
          <div className="metric-card-content">
            <div className="metric-card-label">SWOT Matrix Items</div>
            <div className="metric-card-value">{swotCount}</div>
          </div>
        </div>
        <div className="metric-card purple stagger-item">
          <div className="metric-card-content">
            <div className="metric-card-label">Strategic Focus</div>
            <div className="metric-card-value">Export Launch</div>
          </div>
        </div>
      </div>

      {/* Main Layout: Tabbed section editor */}
      <div className="grid-2" style={{ gridTemplateColumns: '3fr 2fr', gap: 'var(--space-xl)' }}>
        
        {/* Left Side: Business Plan Section Editor */}
        <div className="card">
          <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-md)' }}>
            📝 Document Editor
          </h3>
          
          <div className="tabs">
            {sections.map((section) => (
              <button
                key={section.id}
                id={`tab-section-${section.id}`}
                className={`tab ${activeTab === section.id ? 'active' : ''}`}
                onClick={() => setActiveTab(section.id)}
              >
                {section.title}
              </button>
            ))}
          </div>

          {currentSection ? (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--text-secondary)' }}>
                  {currentSection.title}
                </span>
                <span style={{ fontSize: 'var(--font-size-xxs)', color: 'var(--text-tertiary)' }}>
                  Auto-saved on keystroke
                </span>
              </div>
              <textarea
                id={`textarea-section-${currentSection.id}`}
                className="form-textarea"
                value={currentSection.content}
                onChange={(e) => { void handleSectionTextChange(currentSection.id, e.target.value); }}
                style={{ minHeight: '300px', fontFamily: 'inherit', lineHeight: '1.6', fontSize: 'var(--font-size-sm)', padding: 'var(--space-md)' }}
                placeholder={`Draft details for ${currentSection.title}...`}
              />
            </div>
          ) : (
            <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
              Select a section tab above to start writing.
            </p>
          )}
        </div>

        {/* Right Side: SWOT Matrix */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <div className="card" style={{ paddingBottom: 'var(--space-md)' }}>
            <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-lg)' }}>
              📊 SWOT Matrix
            </h3>
            
            <div className="swot-grid">
              
              {/* STRENGTHS */}
              <div className="swot-quadrant strength">
                <h3>💪 Strengths</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {swotItems.filter((i) => i.category === 'strength').map((item) => (
                    <div key={item.id} className="swot-item animate-scale-in">
                      <span>{item.text}</span>
                      <button
                        id={`btn-delete-swot-${item.id}`}
                        onClick={() => { void handleDeleteSwotItem(item.id); }}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--accent-red)', padding: '2px' }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '4px', marginTop: 'var(--space-sm)' }}>
                  <input
                    id="input-swot-strength-add"
                    className="form-input"
                    type="text"
                    placeholder="Add strength..."
                    value={newStrength}
                    onChange={(e) => setNewStrength(e.target.value)}
                    style={{ height: '30px', fontSize: 'var(--font-size-xs)' }}
                    onKeyDown={(e) => { if (e.key === 'Enter') void handleAddSwotItem(newStrength, 'strength'); }}
                  />
                  <button
                    id="btn-add-swot-strength"
                    className="btn btn-secondary btn-sm"
                    onClick={() => { void handleAddSwotItem(newStrength, 'strength'); }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* WEAKNESSES */}
              <div className="swot-quadrant weakness">
                <h3>⚠️ Weaknesses</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {swotItems.filter((i) => i.category === 'weakness').map((item) => (
                    <div key={item.id} className="swot-item animate-scale-in">
                      <span>{item.text}</span>
                      <button
                        id={`btn-delete-swot-${item.id}`}
                        onClick={() => { void handleDeleteSwotItem(item.id); }}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--accent-red)', padding: '2px' }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '4px', marginTop: 'var(--space-sm)' }}>
                  <input
                    id="input-swot-weakness-add"
                    className="form-input"
                    type="text"
                    placeholder="Add weakness..."
                    value={newWeakness}
                    onChange={(e) => setNewWeakness(e.target.value)}
                    style={{ height: '30px', fontSize: 'var(--font-size-xs)' }}
                    onKeyDown={(e) => { if (e.key === 'Enter') void handleAddSwotItem(newWeakness, 'weakness'); }}
                  />
                  <button
                    id="btn-add-swot-weakness"
                    className="btn btn-secondary btn-sm"
                    onClick={() => { void handleAddSwotItem(newWeakness, 'weakness'); }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* OPPORTUNITIES */}
              <div className="swot-quadrant opportunity">
                <h3>🚀 Opportunities</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {swotItems.filter((i) => i.category === 'opportunity').map((item) => (
                    <div key={item.id} className="swot-item animate-scale-in">
                      <span>{item.text}</span>
                      <button
                        id={`btn-delete-swot-${item.id}`}
                        onClick={() => { void handleDeleteSwotItem(item.id); }}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--accent-red)', padding: '2px' }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '4px', marginTop: 'var(--space-sm)' }}>
                  <input
                    id="input-swot-opportunity-add"
                    className="form-input"
                    type="text"
                    placeholder="Add opportunity..."
                    value={newOpportunity}
                    onChange={(e) => setNewOpportunity(e.target.value)}
                    style={{ height: '30px', fontSize: 'var(--font-size-xs)' }}
                    onKeyDown={(e) => { if (e.key === 'Enter') void handleAddSwotItem(newOpportunity, 'opportunity'); }}
                  />
                  <button
                    id="btn-add-swot-opportunity"
                    className="btn btn-secondary btn-sm"
                    onClick={() => { void handleAddSwotItem(newOpportunity, 'opportunity'); }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* THREATS */}
              <div className="swot-quadrant threat">
                <h3>🔥 Threats</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {swotItems.filter((i) => i.category === 'threat').map((item) => (
                    <div key={item.id} className="swot-item animate-scale-in">
                      <span>{item.text}</span>
                      <button
                        id={`btn-delete-swot-${item.id}`}
                        onClick={() => { void handleDeleteSwotItem(item.id); }}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--accent-red)', padding: '2px' }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '4px', marginTop: 'var(--space-sm)' }}>
                  <input
                    id="input-swot-threat-add"
                    className="form-input"
                    type="text"
                    placeholder="Add threat..."
                    value={newThreat}
                    onChange={(e) => setNewThreat(e.target.value)}
                    style={{ height: '30px', fontSize: 'var(--font-size-xs)' }}
                    onKeyDown={(e) => { if (e.key === 'Enter') void handleAddSwotItem(newThreat, 'threat'); }}
                  />
                  <button
                    id="btn-add-swot-threat"
                    className="btn btn-secondary btn-sm"
                    onClick={() => { void handleAddSwotItem(newThreat, 'threat'); }}
                  >
                    +
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
