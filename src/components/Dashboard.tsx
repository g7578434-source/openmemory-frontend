import { useState } from 'react';
import { BarChart, CheckCircle, Target, Rocket, XCircle, Settings, X, Tag } from 'lucide-react';
import { getDisplayTitle } from '../lib/noteTitleHelper';

interface DashboardProps {
  notes: any[];
  capsule: any;
  onSelectNote: (note: any) => void;
  activeStatusFilter: string | null;
  onSelectStatusFilter: (status: string) => void;
  dashboardPrefs: any;
  onSaveDashboardPrefs: (prefs: any) => void;
}

export function Dashboard({ notes, capsule, onSelectNote, activeStatusFilter, onSelectStatusFilter, dashboardPrefs, onSaveDashboardPrefs }: DashboardProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newCustomMetric, setNewCustomMetric] = useState('');
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionTag, setNewSectionTag] = useState('');

  const allTags = Array.from(new Set(
    notes.flatMap(n => n.note_tags?.map((nt: any) => nt.tags?.name) || [])
  )).filter(Boolean) as string[];

  const handleAddCustomSection = () => {
    if (newSectionTitle.trim() && newSectionTag.trim()) {
      const current = dashboardPrefs.customSections || [];
      const newSection = {
        id: 'sec-' + Date.now(),
        title: newSectionTitle.trim(),
        tag: newSectionTag.trim().toLowerCase().replace('#', '')
      };
      onSaveDashboardPrefs({...dashboardPrefs, customSections: [...current, newSection]});
      setNewSectionTitle('');
      setNewSectionTag('');
    }
  };
  const launchedCount = notes.filter(n => n.status === 'launched').length;
  const validatedCount = notes.filter(n => n.status === 'validated').length;
  const awaitingCount = notes.filter(n => n.status === 'awaiting-test').length;
  const killedCount = notes.filter(n => n.status === 'killed').length;
  const rawCount = notes.filter(n => n.status === 'raw-idea').length;

  // Let's grab some recent notes
  const recentNotes = notes.filter(n => n.status !== 'killed').slice(0, 5);

  return (
    <div className="dashboard-container" style={{ flex: 1, padding: '40px var(--spacing-lg)', display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '900px', margin: '0 auto', overflowY: 'auto', width: '100%' }}>
      
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'Plus Jakarta Sans', color: 'var(--ink)', letterSpacing: '-0.03em', marginBottom: '8px' }}>
            Command Center
          </h1>
          <p style={{ color: 'var(--ink-muted)', fontSize: '14px' }}>
            {notes.length} total notes · {notes.filter(n => n.status !== 'killed').length} active
          </p>
        </div>
        <button 
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          style={{ padding: '8px', color: 'var(--ink-muted)', borderRadius: 'var(--radius-sm)', transition: 'background-color 0.2s', display: 'flex', alignItems: 'center' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-raised)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <Settings size={18} />
        </button>
      </div>

      {isSettingsOpen && (
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Dashboard Settings</h3>
            <button onClick={() => setIsSettingsOpen(false)} style={{ color: 'var(--ink-muted)', display: 'flex' }}><X size={16} /></button>
          </div>
          
          <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
            {/* Sections toggle */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontSize: '11px', color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Visible Sections</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--ink-secondary)' }}>
                <input type="checkbox" style={{ accentColor: 'var(--primary)', width: '14px', height: '14px' }} checked={dashboardPrefs.showActiveContext ?? true} onChange={(e) => onSaveDashboardPrefs({...dashboardPrefs, showActiveContext: e.target.checked})} />
                Active Context
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--ink-secondary)' }}>
                <input type="checkbox" style={{ accentColor: 'var(--primary)', width: '14px', height: '14px' }} checked={dashboardPrefs.showRecentActivity ?? true} onChange={(e) => onSaveDashboardPrefs({...dashboardPrefs, showRecentActivity: e.target.checked})} />
                Recent Activity
              </label>
            </div>
            
            {/* Metrics toggle */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontSize: '11px', color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Visible Metrics</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
                {['launched', 'validated', 'awaiting-test', 'raw-idea', 'killed'].map(status => (
                  <label key={status} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--ink-secondary)' }}>
                    <input 
                      type="checkbox" 
                      style={{ accentColor: 'var(--primary)', width: '14px', height: '14px' }}
                      checked={dashboardPrefs.visibleMetrics?.includes(status) ?? true} 
                      onChange={(e) => {
                        const current = dashboardPrefs.visibleMetrics || [];
                        const next = e.target.checked ? [...current, status] : current.filter((s: string) => s !== status);
                        onSaveDashboardPrefs({...dashboardPrefs, visibleMetrics: next});
                      }} 
                    />
                    {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                  </label>
                ))}
              </div>
            </div>
            {/* Custom Metrics toggle */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '200px' }}>
              <span style={{ fontSize: '11px', color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Custom Metrics</span>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(dashboardPrefs.customMetrics || []).map((cm: string) => (
                  <div key={cm} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '13px', color: 'var(--ink-secondary)' }}>
                    <span>{cm}</span>
                    <button 
                      onClick={() => onSaveDashboardPrefs({...dashboardPrefs, customMetrics: dashboardPrefs.customMetrics.filter((m: string) => m !== cm)})}
                      style={{ color: 'var(--ink-muted)', padding: '2px', borderRadius: '4px', cursor: 'pointer', display: 'flex' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--status-killed)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--ink-muted)'}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {(!dashboardPrefs.customMetrics || dashboardPrefs.customMetrics.length === 0) && (
                  <span style={{ fontSize: '12px', color: 'var(--ink-faint)', fontStyle: 'italic' }}>No custom metrics.</span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '4px', position: 'relative' }}>
                <input 
                  type="text" 
                  value={newCustomMetric}
                  onChange={(e) => setNewCustomMetric(e.target.value)}
                  placeholder="e.g. paused or #tag"
                  style={{ flex: 1, padding: '4px 8px', fontSize: '12px', background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--ink)', width: '130px' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newCustomMetric.trim()) {
                      let trimmed = newCustomMetric.trim().toLowerCase();
                      const current = dashboardPrefs.customMetrics || [];
                      if (!current.includes(trimmed)) {
                        onSaveDashboardPrefs({...dashboardPrefs, customMetrics: [...current, trimmed]});
                        setNewCustomMetric('');
                      }
                    }
                  }}
                />
                {newCustomMetric.startsWith('#') && newCustomMetric.length >= 1 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', boxShadow: '0 4px 12px var(--shadow)', zIndex: 10, maxHeight: '150px', overflowY: 'auto', width: '200px' }}>
                    {allTags.filter(t => t.toLowerCase().includes(newCustomMetric.slice(1).toLowerCase())).length > 0 ? (
                      allTags.filter(t => t.toLowerCase().includes(newCustomMetric.slice(1).toLowerCase())).map(t => (
                        <div 
                          key={t} 
                          style={{ padding: '6px 10px', fontSize: '12px', color: 'var(--ink)', cursor: 'pointer' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-raised)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          onClick={() => {
                            const current = dashboardPrefs.customMetrics || [];
                            const tagMetric = '#' + t.toLowerCase();
                            if (!current.includes(tagMetric)) {
                              onSaveDashboardPrefs({...dashboardPrefs, customMetrics: [...current, tagMetric]});
                              setNewCustomMetric('');
                            }
                          }}
                        >
                          #{t}
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '6px 10px', fontSize: '12px', color: 'var(--ink-faint)', fontStyle: 'italic' }}>No matching tags</div>
                    )}
                  </div>
                )}
                <button 
                  onClick={() => {
                    if (newCustomMetric.trim()) {
                      let trimmed = newCustomMetric.trim().toLowerCase();
                      const current = dashboardPrefs.customMetrics || [];
                      if (!current.includes(trimmed)) {
                        onSaveDashboardPrefs({...dashboardPrefs, customMetrics: [...current, trimmed]});
                        setNewCustomMetric('');
                      }
                    }
                  }}
                  style={{ padding: '4px 10px', fontSize: '12px', background: 'var(--primary-hover)', color: 'var(--primary)', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer' }}
                >
                  Add
                </button>
              </div>
            </div>
            {/* Custom Sections toggle */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '250px' }}>
              <span style={{ fontSize: '11px', color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Custom Sections</span>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(dashboardPrefs.customSections || []).map((cs: any) => (
                  <div key={cs.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '13px', color: 'var(--ink-secondary)' }}>
                    <span>{cs.title} <span style={{ color: 'var(--ink-faint)', fontSize: '11px' }}>#{cs.tag}</span></span>
                    <button 
                      onClick={() => onSaveDashboardPrefs({...dashboardPrefs, customSections: dashboardPrefs.customSections.filter((s: any) => s.id !== cs.id)})}
                      style={{ color: 'var(--ink-muted)', padding: '2px', borderRadius: '4px', cursor: 'pointer', display: 'flex' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--status-killed)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--ink-muted)'}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {(!dashboardPrefs.customSections || dashboardPrefs.customSections.length === 0) && (
                  <span style={{ fontSize: '12px', color: 'var(--ink-faint)', fontStyle: 'italic' }}>No custom sections.</span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <input 
                  type="text" 
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  placeholder="Title"
                  style={{ flex: 1, padding: '4px 8px', fontSize: '12px', background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--ink)', width: '80px' }}
                />
                <div style={{ position: 'relative', flex: 1 }}>
                  <input 
                    type="text" 
                    value={newSectionTag}
                    onChange={(e) => setNewSectionTag(e.target.value)}
                    placeholder="Tag"
                    style={{ width: '100%', padding: '4px 8px', fontSize: '12px', background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--ink)', minWidth: '80px' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddCustomSection();
                    }}
                  />
                  {newSectionTag.length >= 1 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', boxShadow: '0 4px 12px var(--shadow)', zIndex: 10, maxHeight: '150px', overflowY: 'auto', width: '200px' }}>
                      {allTags.filter(t => t.toLowerCase().includes(newSectionTag.toLowerCase().replace('#', ''))).length > 0 ? (
                        allTags.filter(t => t.toLowerCase().includes(newSectionTag.toLowerCase().replace('#', ''))).map(t => (
                          <div 
                            key={t} 
                            style={{ padding: '6px 10px', fontSize: '12px', color: 'var(--ink)', cursor: 'pointer' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-raised)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            onClick={() => {
                              setNewSectionTag(t);
                            }}
                          >
                            {t}
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '6px 10px', fontSize: '12px', color: 'var(--ink-faint)', fontStyle: 'italic' }}>No matching tags</div>
                      )}
                    </div>
                  )}
                </div>
                <button 
                  onClick={handleAddCustomSection}
                  style={{ padding: '4px 10px', fontSize: '12px', background: 'var(--primary-hover)', color: 'var(--primary)', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer' }}
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* At-a-Glance Metrics */}
      <div className="metric-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
        {(dashboardPrefs.visibleMetrics?.includes('launched') ?? true) && <MetricCard title="Launched" count={launchedCount} icon={<Rocket size={16} />} color="var(--status-launched)" bg="var(--status-launched-bg)" isActive={activeStatusFilter === 'launched'} onClick={() => onSelectStatusFilter('launched')} />}
        {(dashboardPrefs.visibleMetrics?.includes('validated') ?? true) && <MetricCard title="Validated (Go)" count={validatedCount} icon={<CheckCircle size={16} />} color="var(--status-validated)" bg="var(--status-validated-bg)" isActive={activeStatusFilter === 'validated'} onClick={() => onSelectStatusFilter('validated')} />}
        {(dashboardPrefs.visibleMetrics?.includes('awaiting-test') ?? true) && <MetricCard title="Awaiting Test" count={awaitingCount} icon={<Target size={16} />} color="var(--status-awaiting)" bg="var(--status-awaiting-bg)" isActive={activeStatusFilter === 'awaiting-test'} onClick={() => onSelectStatusFilter('awaiting-test')} />}
        {(dashboardPrefs.visibleMetrics?.includes('raw-idea') ?? true) && <MetricCard title="Raw Ideas" count={rawCount} icon={<BarChart size={16} />} color="var(--status-raw)" bg="var(--status-raw-bg)" isActive={activeStatusFilter === 'raw-idea'} onClick={() => onSelectStatusFilter('raw-idea')} />}
        {(dashboardPrefs.visibleMetrics?.includes('killed') ?? true) && <MetricCard title="Killed" count={killedCount} icon={<XCircle size={16} />} color="var(--status-killed)" bg="var(--status-killed-bg)" isActive={activeStatusFilter === 'killed'} onClick={() => onSelectStatusFilter('killed')} />}
        
        {(dashboardPrefs.customMetrics || []).map((cm: string) => {
          const isTag = cm.startsWith('#');
          const value = isTag ? cm.slice(1) : cm;
          
          const count = notes.filter(n => {
            if (isTag) {
              return n.note_tags?.some((nt: any) => nt.tags?.name === value);
            }
            return n.status === value;
          }).length;

          return (
            <MetricCard 
              key={cm}
              title={isTag ? value : cm} 
              count={count} 
              icon={<Tag size={16} />} 
              color="var(--primary)" 
              bg="var(--primary-hover)" 
              isActive={activeStatusFilter === cm} 
              onClick={() => onSelectStatusFilter(cm)} 
            />
          );
        })}
      </div>

      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginTop: '16px' }}>
        {/* Active Task / Capsule State */}
        {(dashboardPrefs.showActiveContext ?? true) && (
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--primary)' }}>Active Context</h2>
            {capsule?.next_actions && capsule.next_actions.length > 0 ? (
              <ul style={{ paddingLeft: '20px', margin: 0, color: 'var(--ink-secondary)', fontSize: '14px', lineHeight: 1.6 }}>
                {capsule.next_actions.map((act: string, idx: number) => (
                  <li key={idx} style={{ marginBottom: '8px' }}>{act}</li>
                ))}
              </ul>
            ) : (
              <div style={{ color: 'var(--ink-faint)', fontSize: '13px', fontStyle: 'italic', display: 'flex', alignItems: 'center', height: '100%' }}>
                No active next actions defined in capsule.
              </div>
            )}
          </div>
        )}

        {/* Recent Activity */}
        {(dashboardPrefs.showRecentActivity ?? true) && (
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '400px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--primary)', flexShrink: 0 }}>Recent Activity</h2>
          <div className="custom-scrollbar" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', paddingRight: '8px' }}>
            {recentNotes.length > 0 ? (
              recentNotes.map((note) => (
                <div 
                  key={note.id} 
                  onClick={() => onSelectNote(note)}
                  style={{ padding: '10px 12px', background: 'var(--surface-raised)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'background-color 0.2s', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '4px' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--folder-hover-bg)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-raised)'}
                >
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {getDisplayTitle(note)}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--ink-muted)', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace' }}>
                    {note.status || 'note'}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--ink-faint)', fontSize: '13px', fontStyle: 'italic' }}>
                No recent activity.
              </div>
            )}
          </div>
        </div>
        )}

        {/* Custom Sections */}
        {(dashboardPrefs.customSections || []).map((cs: any) => {
          const sectionNotes = notes
            .filter(n => n.status !== 'killed')
            .filter(n => {
              return n.note_tags?.some((nt: any) => nt.tags?.name === cs.tag);
            })
            .sort((a: any, b: any) => {
              const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
              const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
              return dateB - dateA;
            });

          return (
            <div key={cs.id} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '400px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--primary)', flexShrink: 0 }}>{cs.title}</h2>
              <div className="custom-scrollbar" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', paddingRight: '8px' }}>
                {sectionNotes.length > 0 ? (
                  sectionNotes.map((note) => (
                    <div 
                      key={note.id} 
                      onClick={() => onSelectNote(note)}
                      style={{ padding: '10px 12px', background: 'var(--surface-raised)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'background-color 0.2s', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '4px' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--folder-hover-bg)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-raised)'}
                    >
                      <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {getDisplayTitle(note)}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--ink-muted)', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace' }}>
                        {note.status || 'note'}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ color: 'var(--ink-faint)', fontSize: '13px', fontStyle: 'italic' }}>
                    No notes tagged with #{cs.tag}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MetricCard({ title, count, icon, color, bg, isActive, onClick }: { title: string, count: number, icon: any, color: string, bg: string, isActive: boolean, onClick: () => void }) {
  return (
    <div 
      className="glass-panel" 
      onClick={onClick}
      style={{ 
        padding: '20px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '16px', 
        borderBottom: `3px solid ${color}`,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        transform: isActive ? 'scale(1.02)' : 'scale(1)',
        boxShadow: isActive ? `0 4px 20px ${bg}` : 'none',
        borderColor: isActive ? color : 'var(--border)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: color }}>
        <div style={{ padding: '8px', borderRadius: 'var(--radius-sm)', backgroundColor: bg, display: 'flex' }}>
          {icon}
        </div>
        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{title}</span>
      </div>
      <div style={{ fontSize: '36px', fontWeight: 800, color: 'var(--ink)', fontFamily: 'Plus Jakarta Sans', lineHeight: 1 }}>
        {count}
      </div>
    </div>
  );
}
