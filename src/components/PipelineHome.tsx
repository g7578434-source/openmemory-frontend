/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react';
import { getDisplayTitle } from '../lib/noteTitleHelper';
import { parseScoresFromContent } from '../lib/parseScore';
import { motion, AnimatePresence } from 'framer-motion';

const PIPELINE_STAGES = [
  { id: 'raw-idea', label: 'Raw ideas', description: 'Unfiltered concepts & observations' },
  { id: 'awaiting-test', label: 'Awaiting test', description: 'Ready for market validation' },
  { id: 'validated', label: 'Validated', description: 'Demand proven, awaiting build' },
  { id: 'building', label: 'Building', description: 'Active development phase' },
  { id: 'launched', label: 'Launched', description: 'Live in the market' }
];

const stripHtml = (html: string) => {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
};

const getFirstTextLine = (content: string) => {
  const text = stripHtml(content);
  const firstLine = text.split('\n').map(line => line.trim()).filter(line => line.length > 0 && !line.startsWith('#'))[0];
  return firstLine || 'No preview available...';
};

export function PipelineHome({ notes, onSelectNote, onOpenCommandPalette }: any) {
  const [activeStage, setActiveStage] = useState('raw-idea');

  const groupedNotes = useMemo(() => {
    const groups: Record<string, any[]> = {
      'raw-idea': [],
      'awaiting-test': [],
      'validated': [],
      'building': [],
      'launched': [],
      'killed': []
    };
    
    notes.forEach((note: any) => {
      if (groups[note.status]) {
        groups[note.status].push(note);
      }
    });
    
    return groups;
  }, [notes]);

  const activeNotes = groupedNotes[activeStage] || [];
  
  const totalTracked = PIPELINE_STAGES.reduce((sum, stage) => sum + groupedNotes[stage.id].length, 0);
  const rawCount = groupedNotes['raw-idea'].length;
  const launchedCount = groupedNotes['launched'].length;
  const conversionRate = rawCount > 0 ? ((launchedCount / rawCount) * 100).toFixed(1) : '0.0';

  const getActiveStageDescription = () => PIPELINE_STAGES.find(s => s.id === activeStage)?.description || '';
  const getActiveStageLabel = () => PIPELINE_STAGES.find(s => s.id === activeStage)?.label || '';

  return (
    <div className="pipeline-container">
      {/* Quiet top bar */}
      <div className="pipeline-top-bar">
        <div className="top-bar-left">
          <span className="wordmark">OpenMemory</span>
          <span className="top-dot">•</span>
          <span className="meta-text">{totalTracked} ideas tracked</span>
        </div>
        <div className="top-bar-right">
          <button className="search-hint-btn" onClick={onOpenCommandPalette}>
            <span className="cmd-k">⌘K</span>
          </button>
        </div>
      </div>

      <div className="pipeline-content-scroll">
        <div className="pipeline-center-column">
          
          {/* Hero */}
          <div className="pipeline-hero">
            <span className="hero-eyebrow">THE PIPELINE</span>
            <h1 className="hero-headline">
              A calm, focused, <span className="italic-serif">editorial</span> pipeline.
            </h1>
            <p className="hero-subtitle">Ideas visibly flow through research gates, one step at a time.</p>
          </div>

          {/* Flow Card */}
          <div className="flow-card">
            <div className="flow-card-header">
              <span className="flow-label">FLOW · ALL TIME</span>
              <span className="flow-stat">Raw → Launched conversion {conversionRate}%</span>
            </div>
            
            <div className="flow-stages-row">
              <div className="flow-connection-line"></div>
              {PIPELINE_STAGES.map((stage) => {
                const isActive = activeStage === stage.id;
                const count = groupedNotes[stage.id].length;
                return (
                  <button 
                    key={stage.id} 
                    className={`stage-node-container ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveStage(stage.id)}
                  >
                    <div className={`stage-node node-${stage.id}`}>
                      <span className="node-count">{count}</span>
                    </div>
                    <div className="node-labels">
                      <span className="node-label">{stage.label}</span>
                      <span className="node-sublabel">{count} ideas</span>
                    </div>
                  </button>
                );
              })}
            </div>
            
            <div className="killed-row">
              <div className="killed-indicator">
                <span className="status-square square-killed"></span>
                <span className="killed-text">
                  <span className="mono-count">{groupedNotes['killed'].length}</span> killed at a gate — fast no's keep the pipeline honest.
                </span>
              </div>
            </div>
          </div>

          {/* Focus List */}
          <div className="focus-list-section">
            <div className="focus-list-header">
              <div className="focus-header-left">
                <span className={`status-square square-${activeStage}`}></span>
                <h2 className="focus-stage-name">{getActiveStageLabel()}</h2>
                <span className="focus-stage-desc">— {getActiveStageDescription()}</span>
              </div>
              <div className="focus-header-right">
                <span className="focus-count">{activeNotes.length} ideas</span>
              </div>
            </div>

            <div className="focus-list-items">
              {activeNotes.length === 0 ? (
                <div className="focus-empty">
                  <p>No ideas in this stage yet.</p>
                </div>
              ) : (
                <AnimatePresence>
                  {activeNotes.map((note) => {
                    const scores = parseScoresFromContent(note.content || '');
                    const scoreDisplay = scores.total > 0 ? (scores.total / 10).toFixed(1) : '—';
                    
                    const displayTag = note.note_tags?.[0]?.tags?.name || 'untagged';
                    const sessionTag = note.note_tags?.map((nt: any) => nt.tags?.name).find((t: string) => t.match(/^s\d+$/)) || displayTag;

                    return (
                      <motion.div 
                        key={note.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="idea-row"
                        onClick={() => onSelectNote(note)}
                      >
                        <div className={`score-chip chip-${activeStage}`}>
                          <span className="score-val">{scoreDisplay}</span>
                          <span className="score-label">SCORE</span>
                        </div>
                        
                        <div className="idea-row-body">
                          <h3 className="idea-row-title">{getDisplayTitle(note)}</h3>
                          <p className="idea-row-preview">{getFirstTextLine(note.content)}</p>
                        </div>
                        
                        <div className="idea-row-meta">
                          <div className="status-pill pill-${activeStage}">
                            <span className={`status-dot dot-${activeStage}`}></span>
                            {getActiveStageLabel()}
                          </div>
                          <span className="meta-tag">#{sessionTag}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
