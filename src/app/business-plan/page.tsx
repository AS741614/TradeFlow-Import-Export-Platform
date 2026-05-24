'use client';

import { useEffect, useState, useCallback } from 'react';
import { getItems, setItems, STORAGE_KEYS, getValue, setValue } from '@/lib/storage';
import { generateId, formatDate, nowISO } from '@/lib/utils';
import { getDefaultBusinessPlan, getDefaultSwotItems } from '@/lib/constants';
import type { BusinessPlanSection, SwotItem } from '@/lib/types';

export default function BusinessPlanPage() {
  const [sections, setSections] = useState<BusinessPlanSection[]>([]);
  const [swotItems, setSwotItems] = useState<SwotItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [lastSaved, setLastSaved] = useState<string>('');
  const [initialized, setInitialized] = useState(false);

  // New SWOT item inputs for each quadrant
  const [newStrength, setNewStrength] = useState('');
  const [newWeakness, setNewWeakness] = useState('');
  const [newOpportunity, setNewOpportunity] = useState('');
  const [newThreat, setNewThreat] = useState('');

  useEffect(() => {
    // 1. Load or seed Business Plan Sections
    let loadedSections = getItems<BusinessPlanSection>(STORAGE_KEYS.BUSINESS_PLAN);
    if (loadedSections.length === 0) {
      const defaults = getDefaultBusinessPlan();
      setItems(STORAGE_KEYS.BUSINESS_PLAN, defaults);
      loadedSections = defaults;
    }
    setSections(loadedSections.sort((a, b) => a.order - b.order));
    if (loadedSections.length > 0) {
      setActiveTab(loadedSections[0].id);
    }

    // 2. Load or seed SWOT Items
    let loadedSwot = getItems<SwotItem>(STORAGE_KEYS.SWOT);
    if (loadedSwot.length === 0) {
      const defaults = getDefaultSwotItems();
      setItems(STORAGE_KEYS.SWOT, defaults);
      loadedSwot = defaults;
    }
    setSwotItems(loadedSwot);

    // 3. Load last saved timestamp
    const savedTime = getValue<string>('bp_last_saved', nowISO());
    setLastSaved(savedTime);

    setInitialized(true);
  }, []);

  // Save sections helper
  const saveSections = (updatedSections: BusinessPlanSection[]) => {
    setSections(updatedSections);
    setItems(STORAGE_KEYS.BUSINESS_PLAN, updatedSections);
    const now = nowISO();
    setLastSaved(now);
    setValue('bp_last_saved', now);
  };

  // Save SWOT items helper
  const saveSwot = (updatedSwot: SwotItem[]) => {
    setSwotItems(updatedSwot);
    setItems(STORAGE_KEYS.SWOT, updatedSwot);
    const now = nowISO();
    setLastSaved(now);
    setValue('bp_last_saved', now);
  };

  const handleSectionTextChange = (sectionId: string, newText: string) => {
    const updated = sections.map((s) => (s.id === sectionId ? { ...s, content: newText } : s));
    saveSections(updated);
  };

  const handleAddSwotItem = (text: string, category: SwotItem['category']) => {
    if (!text.trim()) return;
    const newItem: SwotItem = {
      id: generateId(),
      text: text.trim(),
      category,
    };
    const updated = [...swotItems, newItem];
    saveSwot(updated);

    // Clear input
    if (category === 'strength') setNewStrength('');
    if (category === 'weakness') setNewWeakness('');
    if (category === 'opportunity') setNewOpportunity('');
    if (category === 'threat') setNewThreat('');
  };

  const handleDeleteSwotItem = (id: string) => {
    const updated = swotItems.filter((item) => item.id !== id);
    saveSwot(updated);
  };

  if (!initialized) {
    return (
      <div className="empty-state">
        <p>Loading business plan...</p>
      </div>
    );
  }

  const currentSection = sections.find((s) => s.id === activeTab);

  // Completion calculation (e.g. how many sections are not default/empty or simple length checks)
  const totalSections = sections.length;
  const sectionsCompleted = sections.filter((s) => s.content.trim().length > 20).length;
  const swotCount = swotItems.length;
  const completionPercentage = Math.round(((sectionsCompleted) / totalSections) * 100);

  return (
    <div className="animate-fade-in">
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--accent-blue)' }}>
                  Editing: {currentSection.title}
                </h4>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                  Auto-saved on keystroke
                </span>
              </div>
              <textarea
                id={`textarea-section-${currentSection.id}`}
                className="form-textarea"
                value={currentSection.content}
                onChange={(e) => handleSectionTextChange(currentSection.id, e.target.value)}
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
                        onClick={() => handleDeleteSwotItem(item.id)}
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
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSwotItem(newStrength, 'strength')}
                  />
                  <button
                    id="btn-add-swot-strength"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleAddSwotItem(newStrength, 'strength')}
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
                        onClick={() => handleDeleteSwotItem(item.id)}
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
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSwotItem(newWeakness, 'weakness')}
                  />
                  <button
                    id="btn-add-swot-weakness"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleAddSwotItem(newWeakness, 'weakness')}
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
                        onClick={() => handleDeleteSwotItem(item.id)}
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
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSwotItem(newOpportunity, 'opportunity')}
                  />
                  <button
                    id="btn-add-swot-opportunity"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleAddSwotItem(newOpportunity, 'opportunity')}
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
                        onClick={() => handleDeleteSwotItem(item.id)}
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
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSwotItem(newThreat, 'threat')}
                  />
                  <button
                    id="btn-add-swot-threat"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleAddSwotItem(newThreat, 'threat')}
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
