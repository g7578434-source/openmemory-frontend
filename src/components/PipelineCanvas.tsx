/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react';
import { getDisplayTitle } from '../lib/noteTitleHelper';
import { parseScoresFromContent } from '../lib/parseScore';
import { Play, Skull, Activity } from 'lucide-react';

interface PipelineCanvasProps {
  notes: any[];
  onSelectNote: (note: any) => void;
  onMoveNote: (noteId: string, status: string) => Promise<void>;
  onKillNote: (note: any) => void;
  animatingKills: string[];
}

const PIPELINE_STAGES = [
  { id: 'raw-idea', label: 'Raw ideas', description: 'Unfiltered concepts & inputs' },
  { id: 'awaiting-test', label: 'Awaiting test', description: 'Ready for validation' },
  { id: 'validated', label: 'Validated', description: 'Demand proven' },
  { id: 'building', label: 'Building', description: 'Development phase' },
  { id: 'launched', label: 'Launched', description: 'Live in market' }
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

export function PipelineCanvas({
  notes,
  onSelectNote,
  onMoveNote,
  onKillNote,
  animatingKills
}: PipelineCanvasProps) {
  const [draggedOverStage, setDraggedOverStage] = useState<string | null>(null);

  // Group active notes (excluding templates, protocols, general notes, and killed notes)
  const activeNotesByStage = useMemo(() => {
    const groups: Record<string, any[]> = {
      'raw-idea': [],
      'awaiting-test': [],
      'validated': [],
      'building': [],
      'launched': []
    };

    notes.forEach((note: any) => {
      if (groups[note.status]) {
        groups[note.status].push(note);
      }
    });

    return groups;
  }, [notes]);

  // Drag and Drop implementation
  const handleDragStart = (e: React.DragEvent, noteId: string) => {
    e.dataTransfer.setData('text/plain', noteId);
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    if (draggedOverStage !== stageId) {
      setDraggedOverStage(stageId);
    }
  };

  const handleDragLeave = () => {
    setDraggedOverStage(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    setDraggedOverStage(null);
    const noteId = e.dataTransfer.getData('text/plain');
    if (noteId) {
      await onMoveNote(noteId, targetStageId);
    }
  };

  const getScoreDisplayDetails = (noteContent: string) => {
    const scores = parseScoresFromContent(noteContent || '');
    if (scores.total <= 0) return { val: '—', className: 'score-low-bg' };
    const scoreVal = scores.total;
    let className = 'score-low-bg';
    if (scoreVal >= 38) {
      className = 'score-high-bg';
    } else if (scoreVal >= 35) {
      className = 'score-medium-bg';
    }
    return { val: scoreVal, className };
  };

  return (
    <div className="pipeline-canvas-scroll">
      <div className="pipeline-lanes-container">
        {PIPELINE_STAGES.map((stage, index) => {
          const stageNotes = activeNotesByStage[stage.id] || [];
          const isOver = draggedOverStage === stage.id;

          return (
            <div
              key={stage.id}
              className={`conveyor-lane ${isOver ? 'drag-over' : ''}`}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              <div className="lane-header">
                <span className="lane-title">{stage.label}</span>
                <span className="lane-count">{stageNotes.length}</span>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', paddingRight: '2px' }}>
                {stageNotes.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100px', border: '1px dashed var(--hairline)', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--ink-faint)', fontFamily: 'IBM Plex Mono, monospace' }}>EMPTY_STATION</span>
                  </div>
                ) : (
                  stageNotes.map((note) => {
                    const scoreDetails = getScoreDisplayDetails(note.content);
                    const tag = note.note_tags?.[0]?.tags?.name || 's' + (note.title?.match(/Session\s*(\d+)/i)?.[1] || '—');
                    
                    const isAnimatingKill = animatingKills.includes(note.id);

                    return (
                      <div
                        key={note.id}
                        draggable={!isAnimatingKill}
                        onDragStart={(e) => handleDragStart(e, note.id)}
                        onClick={() => !isAnimatingKill && onSelectNote(note)}
                        className={`conveyor-card card-${note.status} ${isAnimatingKill ? 'shaking-card falling-card' : ''}`}
                      >
                        <div className="card-header-row">
                          <span className="card-title-text">{getDisplayTitle(note)}</span>
                          <span className={`card-score ${scoreDetails.className}`}>
                            {scoreDetails.val}
                          </span>
                        </div>
                        
                        <p className="card-preview-text">{getFirstTextLine(note.content)}</p>

                        <div className="card-meta-row">
                          <span className="card-tag">#{tag}</span>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {note.status === 'raw-idea' && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onMoveNote(note.id, 'awaiting-test');
                                  }}
                                  title="Promote to Awaiting Test"
                                  style={{ color: 'var(--status-awaiting)', display: 'flex', alignItems: 'center' }}
                                >
                                  <Play size={11} fill="currentColor" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onKillNote(note);
                                  }}
                                  title="Kill Idea"
                                  style={{ color: 'var(--status-killed)', display: 'flex', alignItems: 'center' }}
                                >
                                  <Skull size={11} />
                                </button>
                              </>
                            )}
                            {note.status === 'awaiting-test' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMoveNote(note.id, 'validated');
                                }}
                                title="Promote to Validated"
                                style={{ color: 'var(--status-validated)', display: 'flex', alignItems: 'center' }}
                              >
                                <Activity size={11} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Render Gates between columns (Visual lines) */}
              {index === 0 && (
                <div className="conveyor-gate" style={{ right: '-12px' }}>
                  <div className="gate-stripe-overlay" style={{ background: 'repeating-linear-gradient(45deg, var(--status-awaiting), var(--status-awaiting) 10px, transparent 10px, transparent 20px)' }} />
                  <span className="gate-badge">Gate 1: Client WASM</span>
                </div>
              )}
              {index === 1 && (
                <div className="conveyor-gate" style={{ right: '-12px' }}>
                  <div className="gate-stripe-overlay" style={{ background: 'repeating-linear-gradient(45deg, var(--status-building), var(--status-building) 10px, transparent 10px, transparent 20px)' }} />
                  <span className="gate-badge" style={{ borderColor: 'var(--status-building)', color: 'var(--status-building)' }}>Gate 2: Google SERP</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
