import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowUpDown, Check, X, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PipelineItem {
  rank: number;
  tool_name: string;
  score: number;
  niche: string;
  status: string;
  scores?: {
    traffic: number;
    cpc: number;
    repeat: number;
    share: number;
    build: number;
  };
  kill_reason?: string;
  competitors?: string[];
}

interface CapsuleState {
  session_number: number;
  validated_count: number;
  raw_ideas_count: number;
  pipeline: PipelineItem[];
  next_actions?: string[];
  tests?: any[];
}

export function PipelineDashboard({
  capsule,
  onSaveCapsule
}: {
  capsule: CapsuleState | null;
  onSaveCapsule: (newState: CapsuleState) => Promise<void>;
}) {
  const [activeSubTab, setActiveSubTab] = useState<'pipeline' | 'tests'>('pipeline');
  const [nicheFilter, setNicheFilter] = useState<string>('All');
  const [sortAsc, setSortAsc] = useState<boolean | null>(null); // null means default rank sorting

  // Kill Modal State
  const [killTarget, setKillTarget] = useState<PipelineItem | null>(null);
  const [killReason, setKillReason] = useState('');
  const [competitorsText, setCompetitorsText] = useState('');
  const [submittingKill, setSubmittingKill] = useState(false);

  const handlePromote = async (item: PipelineItem) => {
    if (!capsule) return;

    const updatedPipeline = capsule.pipeline.map(p => {
      if (p.tool_name === item.tool_name) {
        return { ...p, status: 'awaiting-test' };
      }
      return p;
    });

    const validatedCount = updatedPipeline.filter(p => p.status === 'validated').length;
    const rawCount = updatedPipeline.filter(p => p.status === 'raw-idea').length;

    const updatedCapsule = {
      ...capsule,
      pipeline: updatedPipeline,
      validated_count: validatedCount,
      raw_ideas_count: rawCount
    };

    // Attempt to also update status in notes table if a note exists with that title
    try {
      await supabase
        .from('notes')
        .update({ status: 'awaiting-test' })
        .eq('title', item.tool_name);
    } catch (err) {
      console.error("Failed to update status in notes table:", err);
    }

    await onSaveCapsule(updatedCapsule);
  };

  const handleOpenKillModal = (item: PipelineItem) => {
    setKillTarget(item);
    setKillReason('');
    setCompetitorsText('');
  };

  const handleCloseKillModal = () => {
    setKillTarget(null);
  };

  const handleConfirmKill = async () => {
    if (!capsule || !killTarget) return;

    setSubmittingKill(true);
    try {
      // 1. Create a note for the Kill registry (F3 equivalent)
      const title = `KILL: ${killTarget.tool_name}`;
      const competitors = competitorsText
        .split('\n')
        .map(c => c.trim())
        .filter(Boolean);

      const lines = [
        `## Kill Registry Entry`,
        ``,
        `**Idea:** ${killTarget.tool_name}`,
        `**Niche:** ${killTarget.niche}`,
        `**Session:** #${capsule.session_number}`,
        `**Reason:** ${killReason}`,
      ];
      if (killTarget.score !== undefined) {
        lines.push(`**Score:** ${killTarget.score}`);
      }
      if (competitors.length > 0) {
        lines.push(``, `**Competitors Found:**`);
        competitors.forEach(c => lines.push(`- ${c}`));
      }
      const content = lines.join('\n');

      // Create the note
      const { data: note, error: noteErr } = await supabase
        .from('notes')
        .insert({ title, content, status: 'killed' })
        .select()
        .single();

      if (noteErr) throw noteErr;

      // Link to "killed" tag
      let { data: tagData } = await supabase
        .from('tags')
        .select()
        .eq('name', 'killed')
        .maybeSingle();

      if (!tagData) {
        const { data: newTag, error: tagErr } = await supabase
          .from('tags')
          .insert({ name: 'killed' })
          .select()
          .single();
        if (tagErr) throw tagErr;
        tagData = newTag;
      }

      await supabase
        .from('note_tags')
        .insert({ note_id: note.id, tag_id: tagData.id });

      // 2. Update status in capsule pipeline
      const updatedPipeline = capsule.pipeline.map(p => {
        if (p.tool_name === killTarget.tool_name) {
          return {
            ...p,
            status: 'killed',
            kill_reason: killReason,
            competitors: competitors
          };
        }
        return p;
      });

      const validatedCount = updatedPipeline.filter(p => p.status === 'validated').length;
      const rawCount = updatedPipeline.filter(p => p.status === 'raw-idea').length;

      const updatedCapsule = {
        ...capsule,
        pipeline: updatedPipeline,
        validated_count: validatedCount,
        raw_ideas_count: rawCount
      };

      // Also try to update status in notes table for the original note if it existed
      try {
        await supabase
          .from('notes')
          .update({ status: 'killed' })
          .eq('title', killTarget.tool_name);
      } catch (err) {
        console.error("Failed to update status in notes table:", err);
      }

      await onSaveCapsule(updatedCapsule);
      setKillTarget(null);
    } catch (err: any) {
      console.error("Error killing idea:", err);
      alert(`Error killing idea: ${err.message}`);
    } finally {
      setSubmittingKill(false);
    }
  };

  if (!capsule) {
    return (
      <div className="pipeline-dashboard-empty">
        <p className="body-md">No pipeline found.</p>
      </div>
    );
  }

  // Filter pipeline items
  let displayItems = [...capsule.pipeline];
  if (nicheFilter !== 'All') {
    displayItems = displayItems.filter(item => item.niche === nicheFilter);
  }

  // Sort pipeline items
  if (sortAsc !== null) {
    displayItems.sort((a, b) => {
      return sortAsc ? a.score - b.score : b.score - a.score;
    });
  }

  const toggleSort = () => {
    if (sortAsc === null) {
      setSortAsc(false); // Sort descending first (highest score)
    } else if (sortAsc === false) {
      setSortAsc(true); // Sort ascending
    } else {
      setSortAsc(null); // Clear sorting (uses default ranks)
    }
  };

  const getScoreClass = (score: number) => {
    if (score >= 38) return 'score-high';
    if (score >= 35) return 'score-medium';
    return 'score-low';
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'validated':
        return 'status-badge-validated';
      case 'awaiting-test':
        return 'status-badge-awaiting';
      case 'killed':
        return 'status-badge-killed';
      case 'raw-idea':
      default:
        return 'status-badge-raw';
    }
  };

  const formatStatusText = (status: string) => {
    switch (status) {
      case 'validated':
        return 'Validated';
      case 'awaiting-test':
        return 'Awaiting Test';
      case 'killed':
        return 'Killed';
      case 'raw-idea':
        return 'Raw';
      default:
        return status;
    }
  };

  const defaultTests = [
    {
      id: "test-1",
      name: "TEST 1 — Pay Transparency Compliance Risk Checker",
      headline: "Does Your Company Comply With Pay Transparency Laws?",
      cta: "Get My Free State-by-State Report →",
      platforms: "r/smallbusiness, r/humanresources, r/entrepreneur, r/legaladvice + LinkedIn HR",
      signups: 0,
      time_elapsed: "0h",
      status: "not-started"
    },
    {
      id: "test-2",
      name: "TEST 2 — Non-Compete Enforceability Checker",
      headline: "Is Your Non-Compete Agreement Actually Enforceable?",
      cta: "Check My Non-Compete Free →",
      platforms: "r/legaladvice, r/jobs, r/freelance, r/cscareerquestions",
      signups: 0,
      time_elapsed: "0h",
      status: "not-started"
    },
    {
      id: "test-3",
      name: "TEST 3 — Contractor Misclassification Risk Checker",
      headline: "Are Your 1099 Contractors at Risk of IRS Reclassification?",
      cta: "Check My Risk Free →",
      platforms: "r/smallbusiness, r/entrepreneur, r/Accounting",
      signups: 0,
      time_elapsed: "0h",
      status: "not-started"
    }
  ];

  const tests = (capsule as any)?.tests || defaultTests;

  const handleUpdateTest = async (testId: string, updates: any) => {
    if (!capsule) return;
    
    const updatedTests = tests.map((t: any) => {
      if (t.id === testId) {
        const next = { ...t, ...updates };
        if (updates.signups !== undefined) {
          const signupsNum = parseInt(updates.signups) || 0;
          if (signupsNum >= 20) {
            next.status = 'validated';
          } else if (signupsNum > 0 && next.status === 'not-started') {
            next.status = 'counting';
          }
        }
        return next;
      }
      return t;
    });

    await onSaveCapsule({
      ...capsule,
      tests: updatedTests
    });
  };

  return (
    <div className="pipeline-dashboard-container">
      {/* Sub tabs navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--hairline)', padding: '0 32px', gap: '24px', backgroundColor: 'var(--sidebar-bg)' }}>
        <button 
          onClick={() => setActiveSubTab('pipeline')}
          style={{
            padding: '12px 0',
            fontSize: '13.5px',
            fontWeight: activeSubTab === 'pipeline' ? 600 : 500,
            color: activeSubTab === 'pipeline' ? 'var(--primary)' : 'var(--ink-secondary)',
            borderBottom: activeSubTab === 'pipeline' ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: '-1px',
            transition: 'all 0.15s ease'
          }}
        >
          Idea Pipeline
        </button>
        <button 
          onClick={() => setActiveSubTab('tests')}
          style={{
            padding: '12px 0',
            fontSize: '13.5px',
            fontWeight: activeSubTab === 'tests' ? 600 : 500,
            color: activeSubTab === 'tests' ? 'var(--primary)' : 'var(--ink-secondary)',
            borderBottom: activeSubTab === 'tests' ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: '-1px',
            transition: 'all 0.15s ease'
          }}
        >
          Validation Tests
        </button>
      </div>

      {activeSubTab === 'pipeline' ? (
        <>
          {/* Controls Bar */}
          <div className="dashboard-controls-bar">
            <div className="controls-left">
              <h2 className="notes-title">Research Pipeline</h2>
              <div className="pipeline-stats">
                <span className="stat-pill">Session #{capsule.session_number}</span>
                <span className="stat-pill text-green">🟢 {capsule.validated_count} validated</span>
                <span className="stat-pill text-muted">🔴 {capsule.raw_ideas_count} raw ideas</span>
              </div>
            </div>
            
            <div className="controls-right">
              <div className="filter-dropdown-container">
                <Filter size={14} className="filter-dropdown-icon" />
                <select
                  value={nicheFilter}
                  onChange={(e) => setNicheFilter(e.target.value)}
                  className="dashboard-select"
                >
                  <option value="All">All Niches</option>
                  <option value="Legal">Legal</option>
                  <option value="Finance">Finance</option>
                  <option value="Insurance">Insurance</option>
                  <option value="B2B">B2B</option>
                </select>
              </div>
            </div>
          </div>

          {/* Main Table */}
          <div className="dashboard-table-wrapper">
            {displayItems.length === 0 ? (
              <div className="dashboard-empty-table">
                <p className="body-sm text-muted">No items match the selected filter.</p>
              </div>
            ) : (
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>Rank</th>
                    <th>Tool Name</th>
                    <th 
                      onClick={toggleSort}
                      className="sortable-header"
                      style={{ width: '100px', cursor: 'pointer' }}
                    >
                      <div className="th-content">
                        Score
                        <ArrowUpDown size={13} className={`sort-icon ${sortAsc !== null ? 'active' : ''}`} />
                      </div>
                    </th>
                    <th style={{ width: '120px' }}>Niche</th>
                    <th style={{ width: '140px' }}>Status</th>
                    <th style={{ width: '180px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayItems.map((item) => (
                    <tr key={item.tool_name}>
                      <td>
                        <span className="rank-badge">#{item.rank}</span>
                      </td>
                      <td>
                        <div className="tool-name-container">
                          <span className="tool-name-text">{item.tool_name}</span>
                          {item.kill_reason && (
                            <span className="kill-reason-subtext" title={item.kill_reason}>
                              Reason: {item.kill_reason}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`score-badge ${getScoreClass(item.score)}`}>
                          {item.score}
                        </span>
                      </td>
                      <td>
                        <span className="niche-badge">{item.niche}</span>
                      </td>
                      <td>
                        <span className={`status-pill ${getStatusBadgeClass(item.status)}`}>
                          {formatStatusText(item.status)}
                        </span>
                      </td>
                      <td>
                        <div className="actions-cell">
                          {item.status === 'raw-idea' && (
                            <>
                              <button
                                onClick={() => handlePromote(item)}
                                className="btn-action-promote"
                                title="Promote to awaiting-test"
                              >
                                <Check size={13} /> Promote
                              </button>
                              <button
                                onClick={() => handleOpenKillModal(item)}
                                className="btn-action-kill"
                                title="Kill idea"
                              >
                                <X size={13} /> Kill
                              </button>
                            </>
                          )}
                          {item.status === 'awaiting-test' && (
                            <span className="action-text-muted">Awaiting test...</span>
                          )}
                          {item.status === 'validated' && (
                            <span className="action-text-green">Validated ✅</span>
                          )}
                          {item.status === 'killed' && (
                            <span className="action-text-red">Killed ❌</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px', padding: '32px', overflowY: 'auto', flex: 1 }}>
          {tests.map((test: any) => {
            const progressPercent = Math.min(100, ((test.signups || 0) / 20) * 100);
            return (
              <div key={test.id} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>{test.name}</h3>
                  <span className={`status-pill ${
                    test.status === 'validated' ? 'status-badge-validated' :
                    test.status === 'failed' ? 'status-badge-killed' :
                    test.status === 'live' ? 'status-badge-live' :
                    test.status === 'counting' ? 'status-badge-awaiting' :
                    'status-badge-raw'
                  }`} style={{ flexShrink: 0 }}>
                    {test.status === 'validated' ? 'Validated ✅' :
                     test.status === 'failed' ? 'Failed ❌' :
                     test.status === 'live' ? 'Live 🔵' :
                     test.status === 'counting' ? 'Counting 🟡' :
                     'Not Started'}
                  </span>
                </div>

                <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--hairline)', paddingTop: '12px' }}>
                  <span style={{ color: 'var(--ink-muted)' }}><strong>Headline:</strong> "{test.headline}"</span>
                  <span style={{ color: 'var(--ink-muted)' }}><strong>CTA:</strong> "{test.cta}"</span>
                  <span style={{ color: 'var(--ink-muted)' }}><strong>Channels:</strong> {test.platforms}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'center' }}>
                  <div className="modal-form-group">
                    <label className="modal-label" htmlFor={`signups-${test.id}`}>Signups</label>
                    <input
                      id={`signups-${test.id}`}
                      type="number"
                      value={test.signups || 0}
                      onChange={(e) => handleUpdateTest(test.id, { signups: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="scoring-input"
                      style={{ textAlign: 'left', marginTop: '4px', height: '34px', backgroundColor: 'var(--canvas)' }}
                    />
                  </div>
                  <div className="modal-form-group">
                    <label className="modal-label" htmlFor={`time-${test.id}`}>Time Elapsed</label>
                    <input
                      id={`time-${test.id}`}
                      type="text"
                      value={test.time_elapsed || '0h'}
                      onChange={(e) => handleUpdateTest(test.id, { time_elapsed: e.target.value })}
                      className="scoring-input"
                      style={{ textAlign: 'left', marginTop: '4px', height: '34px', backgroundColor: 'var(--canvas)' }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: 'var(--ink-muted)' }}>
                    <span>Progress towards validation threshold</span>
                    <span>{test.signups || 0} / 20</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--canvas-soft)', borderRadius: 'var(--radius-full)', overflow: 'hidden', marginTop: '6px' }}>
                    <div style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: test.status === 'validated' ? '#22c55e' : 'var(--primary)', transition: 'width 0.3s ease' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--hairline)', paddingTop: '12px', marginTop: 'auto' }}>
                  <label className="modal-label" style={{ alignSelf: 'center', marginRight: 'auto' }} htmlFor={`status-select-${test.id}`}>Change Status</label>
                  <select
                    id={`status-select-${test.id}`}
                    value={test.status}
                    onChange={(e) => handleUpdateTest(test.id, { status: e.target.value })}
                    className="dashboard-select"
                    style={{ border: '1px solid var(--hairline)', borderRadius: 'var(--radius-sm)', padding: '4px 8px', backgroundColor: 'var(--canvas)', color: 'var(--ink)' }}
                  >
                    <option value="not-started">Not Started</option>
                    <option value="live">Live</option>
                    <option value="counting">Counting</option>
                    <option value="validated">Validated ✅</option>
                    <option value="failed">Failed ❌</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Kill Confirmation Inline Dialog */}
      <AnimatePresence>
        {killTarget && (
          <div className="modal-backdrop">
            <motion.div 
              className="modal-content glass-panel"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="modal-header">
                <h3>Kill Idea: {killTarget.tool_name}</h3>
                <button onClick={handleCloseKillModal} className="btn-close-modal">
                  <X size={16} />
                </button>
              </div>
              
              <div className="modal-body">
                <p className="body-sm text-muted" style={{ marginBottom: '12px' }}>
                  Document the kill registry entry. Below 35 score is auto-killed, or if 3+ free competitors exist.
                </p>

                <div className="modal-form-group">
                  <label className="modal-label">Kill Reason</label>
                  <textarea
                    value={killReason}
                    onChange={(e) => setKillReason(e.target.value)}
                    placeholder="e.g. 3+ free tools exist / Market saturated / Score below 35"
                    className="modal-textarea"
                    rows={3}
                  />
                </div>

                <div className="modal-form-group">
                  <label className="modal-label">Competitors Found (One per line)</label>
                  <textarea
                    value={competitorsText}
                    onChange={(e) => setCompetitorsText(e.target.value)}
                    placeholder="e.g. https://competitor.com"
                    className="modal-textarea"
                    rows={3}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  onClick={handleCloseKillModal} 
                  className="btn-utility"
                  disabled={submittingKill}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmKill} 
                  className="btn-danger"
                  disabled={!killReason.trim() || submittingKill}
                >
                  {submittingKill ? 'Logging Kill...' : 'Confirm Kill ❌'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
