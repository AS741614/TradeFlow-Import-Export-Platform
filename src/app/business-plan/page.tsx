'use client';

import { useState, useEffect } from 'react';
import { getItems, addItem, updateItem, removeItem, getValue, setValue } from '@/lib/storage';
import { generateId, formatDate, nowISO, calcPercentage } from '@/lib/utils';
import type { BusinessPlanSection, SwotItem } from '@/lib/types';
import { StorageError } from '@/lib/api-client';
import Loading from '@/components/Loading';
import ErrorBanner from '@/components/ErrorBanner';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { FormSection } from '@/components/ui/FormSection';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';

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
        const loadedSections = await getItems<BusinessPlanSection>('business-plan');
        const loadedSwot = await getItems<SwotItem>('swot');
        const savedTime = await getValue<string>('bp_last_saved', nowISO());

        if (!cancelled) {
          const sorted = loadedSections.sort((a, b) => a.sortOrder - b.sortOrder);
          setSections(sorted);
          setSwotItems(loadedSwot);
          setActiveTab(sorted[0]?.id ?? '');
          setLastSaved(savedTime);
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

  async function markBusinessPlanSaved() {
    try {
      const timestamp = nowISO();
      await setValue<string>('bp_last_saved', timestamp);
      setLastSaved(timestamp);
    } catch (err) {
      console.error('Failed to update bp_last_saved:', err);
    }
  }

  const handleSectionTextChange = async (sectionId: string, newText: string) => {
    setError(null);
    try {
      const fresh = await updateItem<BusinessPlanSection>('business-plan', sectionId, { content: newText });
      setSections(fresh.sort((a, b) => a.sortOrder - b.sortOrder));
      await markBusinessPlanSaved();
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
      await markBusinessPlanSaved();

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
      await markBusinessPlanSaved();
    } catch (err) {
      setError(err instanceof StorageError ? err.message : 'Failed to delete SWOT item');
    }
  };

  const currentSection = sections.find((s) => s.id === activeTab);

  const totalSections = sections.length;
  const sectionsCompleted = sections.filter((s) => s.content.trim().length > 20).length;
  const swotCount = swotItems.length;
  const completionPercentage = calcPercentage(sectionsCompleted, totalSections);

  if (loading) return <Loading />;

  return (
    <div className="animate-fade-in">
      {error && <ErrorBanner message={error} />}
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-top">
          <h1>Business Plan & Strategy</h1>
          <Badge variant="neutral">
            Saved: {formatDate(lastSaved)}
          </Badge>
        </div>
        <p>Draft your export strategy, perform SWOT audits, and outline project KPIs directly on-platform.</p>
      </div>

      {/* Strategic KPIs */}
      <div className="grid-4">
        <Card className="metric-card blue stagger-item">
          <div className="metric-card-content">
            <div className="metric-card-label">Total Sections</div>
            <div className="metric-card-value">{totalSections}</div>
          </div>
        </Card>
        <Card className="metric-card emerald stagger-item">
          <div className="metric-card-content">
            <div className="metric-card-label">Completion Status</div>
            <div className="metric-card-value">{completionPercentage}%</div>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${String(completionPercentage)}%` }} />
            </div>
          </div>
        </Card>
        <Card className="metric-card amber stagger-item">
          <div className="metric-card-content">
            <div className="metric-card-label">SWOT Matrix Items</div>
            <div className="metric-card-value">{swotCount}</div>
          </div>
        </Card>
        <Card className="metric-card purple stagger-item">
          <div className="metric-card-content">
            <div className="metric-card-label">Strategic Focus</div>
            <div className="metric-card-value">Export Launch</div>
          </div>
        </Card>
      </div>

      {/* Main Layout: Tabbed section editor */}
      <div className="grid-2" style={{ gridTemplateColumns: '3fr 2fr' }}>
        
        {/* Left Side: Business Plan Section Editor */}
        <Card header={<h3 className="text-md font-semibold">📝 Document Editor</h3>}>
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
            <FormSection
              id="bp-editor-section"
              title={currentSection.title}
              description="Auto-saved on keystroke"
            >
              <FormField
                id={`textarea-section-${currentSection.id}`}
              >
                <textarea
                  className="form-textarea bp-editor-textarea"
                  value={currentSection.content}
                  onChange={(e) => { void handleSectionTextChange(currentSection.id, e.target.value); }}
                  placeholder={`Draft details for ${currentSection.title}...`}
                />
              </FormField>
            </FormSection>
          ) : (
            <p className="text-sm text-tertiary">
              Select a section tab above to start writing.
            </p>
          )}
        </Card>

        {/* Right Side: SWOT Matrix */}
        <Card header={<h3 className="text-md font-semibold">📊 SWOT Matrix</h3>}>
          <div className="swot-grid">
            
            {/* STRENGTHS */}
            <div className="swot-quadrant strength">
              <h3>💪 Strengths</h3>
              <div className="swot-list">
                {swotItems.filter((i) => i.category === 'strength').map((item) => (
                  <div key={item.id} className="swot-item animate-scale-in">
                    <span>{item.text}</span>
                    <button
                      id={`btn-delete-swot-${item.id}`}
                      onClick={() => { void handleDeleteSwotItem(item.id); }}
                      className="swot-delete-btn"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <div className="swot-add-row">
                <input
                  id="input-swot-strength-add"
                  className="form-input swot-input"
                  type="text"
                  placeholder="Add strength..."
                  value={newStrength}
                  onChange={(e) => setNewStrength(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleAddSwotItem(newStrength, 'strength'); }}
                />
                <Button
                  id="btn-add-swot-strength"
                  variant="secondary"
                  size="sm"
                  onClick={() => { void handleAddSwotItem(newStrength, 'strength'); }}
                >
                  +
                </Button>
              </div>
            </div>

            {/* WEAKNESSES */}
            <div className="swot-quadrant weakness">
              <h3>⚠️ Weaknesses</h3>
              <div className="swot-list">
                {swotItems.filter((i) => i.category === 'weakness').map((item) => (
                  <div key={item.id} className="swot-item animate-scale-in">
                    <span>{item.text}</span>
                    <button
                      id={`btn-delete-swot-${item.id}`}
                      onClick={() => { void handleDeleteSwotItem(item.id); }}
                      className="swot-delete-btn"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <div className="swot-add-row">
                <input
                  id="input-swot-weakness-add"
                  className="form-input swot-input"
                  type="text"
                  placeholder="Add weakness..."
                  value={newWeakness}
                  onChange={(e) => setNewWeakness(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleAddSwotItem(newWeakness, 'weakness'); }}
                />
                <Button
                  id="btn-add-swot-weakness"
                  variant="secondary"
                  size="sm"
                  onClick={() => { void handleAddSwotItem(newWeakness, 'weakness'); }}
                >
                  +
                </Button>
              </div>
            </div>

            {/* OPPORTUNITIES */}
            <div className="swot-quadrant opportunity">
              <h3>🚀 Opportunities</h3>
              <div className="swot-list">
                {swotItems.filter((i) => i.category === 'opportunity').map((item) => (
                  <div key={item.id} className="swot-item animate-scale-in">
                    <span>{item.text}</span>
                    <button
                      id={`btn-delete-swot-${item.id}`}
                      onClick={() => { void handleDeleteSwotItem(item.id); }}
                      className="swot-delete-btn"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <div className="swot-add-row">
                <input
                  id="input-swot-opportunity-add"
                  className="form-input swot-input"
                  type="text"
                  placeholder="Add opportunity..."
                  value={newOpportunity}
                  onChange={(e) => setNewOpportunity(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleAddSwotItem(newOpportunity, 'opportunity'); }}
                />
                <Button
                  id="btn-add-swot-opportunity"
                  variant="secondary"
                  size="sm"
                  onClick={() => { void handleAddSwotItem(newOpportunity, 'opportunity'); }}
                >
                  +
                </Button>
              </div>
            </div>

            {/* THREATS */}
            <div className="swot-quadrant threat">
              <h3>🔥 Threats</h3>
              <div className="swot-list">
                {swotItems.filter((i) => i.category === 'threat').map((item) => (
                  <div key={item.id} className="swot-item animate-scale-in">
                    <span>{item.text}</span>
                    <button
                      id={`btn-delete-swot-${item.id}`}
                      onClick={() => { void handleDeleteSwotItem(item.id); }}
                      className="swot-delete-btn"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <div className="swot-add-row">
                <input
                  id="input-swot-threat-add"
                  className="form-input swot-input"
                  type="text"
                  placeholder="Add threat..."
                  value={newThreat}
                  onChange={(e) => setNewThreat(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleAddSwotItem(newThreat, 'threat'); }}
                />
                <Button
                  id="btn-add-swot-threat"
                  variant="secondary"
                  size="sm"
                  onClick={() => { void handleAddSwotItem(newThreat, 'threat'); }}
                >
                  +
                </Button>
              </div>
            </div>

          </div>
        </Card>
      </div>
    </div>
  );
}
