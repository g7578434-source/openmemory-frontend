/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useRef, useEffect } from 'react';
import { ArrowRight, Search, Plus, Sun, Moon, Settings, ChevronDown, Folder } from 'lucide-react';

interface CockpitHUDProps {
  capsule: any;
  notes: any[];
  folders: any[];
  activeTagFilter: string | null;
  onSelectTagFilter: (tag: string | null) => void;
  onSearchClick: () => void;
  onNewNote: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const FOLDER_GROUPS: { section: string; tags: string[] }[] = [
  {
    section: 'WORKSPACE',
    tags: ['validated-ideas', 'research', 'rejected-ideas'],
  },
  {
    section: 'SYSTEM',
    tags: ['template', 'protocol'],
  },
];

function formatFolderName(tag: string): string {
  return tag
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function CockpitHUD({
  capsule,
  notes,
  folders,
  activeTagFilter,
  onSelectTagFilter,
  onSearchClick,
  onNewNote,
  theme,
  onToggleTheme
}: CockpitHUDProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const killedCount = notes.filter((n: any) => n.status === 'killed').length;
  const activeCount = notes.filter((n: any) => n.status && n.status !== 'killed' && n.status !== 'note' && n.status !== 'template' && n.status !== 'protocol').length;

  const sessionNum = capsule?.session_number ?? '—';
  const validatedCount = capsule?.validated_count ?? notes.filter(n => n.status === 'validated').length;
  
  const latestAction = capsule?.next_actions?.[0] || 'Awaiting incoming raw ideas...';

  // Click outside to close folder dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const tagMap = useMemo(() => {
    return new Map<string, number>(
      (folders || []).map(f => [f.name, f.note_tags?.[0]?.count ?? 0])
    );
  }, [folders]);

  const otherTags = useMemo(() => {
    const definedTags = new Set(FOLDER_GROUPS.flatMap(g => g.tags));
    return (folders || [])
      .map(f => f.name)
      .filter(name => !definedTags.has(name));
  }, [folders]);

  const currentFilterLabel = activeTagFilter ? formatFolderName(activeTagFilter) : 'All Notes';

  return (
    <div className="cockpit-hud">
      {/* Brand & Filter Dropdown */}
      <div className="hud-section" ref={dropdownRef} style={{ position: 'relative' }}>
        <button 
          onClick={() => onSelectTagFilter(null)}
          className="wordmark" 
          style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--primary)', textTransform: 'uppercase', marginRight: '8px' }}
        >
          OpenMemory
        </button>
        <span className="top-dot" style={{ color: 'var(--ink-faint)' }}>•</span>
        
        <button 
          onClick={() => setDropdownOpen(!dropdownOpen)} 
          className="search-hint-btn" 
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--ink-secondary)', fontSize: '12px' }}
        >
          <Folder size={12} style={{ color: activeTagFilter ? 'var(--primary)' : 'var(--ink-faint)' }} />
          <span>{currentFilterLabel}</span>
          <ChevronDown size={10} style={{ opacity: 0.6 }} />
        </button>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <div 
            className="glass-panel" 
            style={{ position: 'absolute', top: 'calc(100% + 8px)', left: '88px', minWidth: '200px', zIndex: 100, padding: '6px', display: 'flex', flexDirection: 'column', gap: '2px', background: 'var(--surface-raised)', border: '1px solid var(--hairline)', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', borderRadius: 'var(--radius-md)' }}
          >
            <button
              onClick={() => {
                onSelectTagFilter(null);
                setDropdownOpen(false);
              }}
              style={{ padding: '6px 12px', fontSize: '12.5px', color: !activeTagFilter ? 'var(--primary)' : 'var(--ink-secondary)', textAlign: 'left', width: '100%', borderRadius: 'var(--radius-xs)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: !activeTagFilter ? 'rgba(99, 102, 241, 0.08)' : 'transparent' }}
              className="sidebar-folder-row"
            >
              <span>All Notes</span>
              <span style={{ fontSize: '10px', opacity: 0.5 }}>{notes.length}</span>
            </button>

            {FOLDER_GROUPS.map(({ section, tags }) => {
              const hasVisibleTag = tags.some(t => tagMap.has(t));
              if (!hasVisibleTag) return null;

              return (
                <div key={section} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--folder-section-label)', padding: '6px 12px 2px 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {section}
                  </div>
                  {tags.map(tagName => {
                    const count = tagMap.get(tagName) ?? 0;
                    const isActive = activeTagFilter === tagName;
                    if (!tagMap.has(tagName)) return null;

                    return (
                      <button
                        key={tagName}
                        onClick={() => {
                          onSelectTagFilter(tagName);
                          setDropdownOpen(false);
                        }}
                        style={{ padding: '5px 12px', fontSize: '12.5px', color: isActive ? 'var(--primary)' : 'var(--ink-secondary)', textAlign: 'left', width: '100%', borderRadius: 'var(--radius-xs)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isActive ? 'rgba(99, 102, 241, 0.08)' : 'transparent' }}
                        className="sidebar-folder-row"
                      >
                        <span>{formatFolderName(tagName)}</span>
                        {count > 0 && <span style={{ fontSize: '10px', opacity: 0.5 }}>{count}</span>}
                      </button>
                    );
                  })}
                </div>
              );
            })}

            {otherTags.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--folder-section-label)', padding: '6px 12px 2px 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  OTHER
                </div>
                {otherTags.map(tagName => {
                  const count = tagMap.get(tagName) ?? 0;
                  const isActive = activeTagFilter === tagName;

                  return (
                    <button
                      key={tagName}
                      onClick={() => {
                        onSelectTagFilter(tagName);
                        setDropdownOpen(false);
                      }}
                      style={{ padding: '5px 12px', fontSize: '12.5px', color: isActive ? 'var(--primary)' : 'var(--ink-secondary)', textAlign: 'left', width: '100%', borderRadius: 'var(--radius-xs)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isActive ? 'rgba(99, 102, 241, 0.08)' : 'transparent' }}
                      className="sidebar-folder-row"
                    >
                      <span>{formatFolderName(tagName)}</span>
                      {count > 0 && <span style={{ fontSize: '10px', opacity: 0.5 }}>{count}</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Next Actions display */}
      <div className="hud-section" style={{ flex: 1, justifyContent: 'center', minWidth: 0 }}>
        <ArrowRight size={13} style={{ color: 'var(--ink-faint)', flexShrink: 0 }} />
        <span className="hud-label" style={{ marginRight: '4px', display: 'inline', flexShrink: 0 }}>Next Action:</span>
        <span className="hud-action" title={latestAction} style={{ color: 'var(--ink-secondary)', fontSize: '12px' }}>{latestAction}</span>
      </div>

      {/* Stats and Controls */}
      <div className="hud-section" style={{ gap: '10px' }}>
        <span className="hud-label" style={{ display: 'flex', gap: '3px' }}>
          S:
          <span className="hud-value" style={{ padding: '1px 5px', fontSize: '11px' }}>#{sessionNum}</span>
        </span>

        <span className="hud-label" style={{ display: 'flex', gap: '3px' }}>
          A:
          <span className="hud-value" style={{ padding: '1px 5px', fontSize: '11px', color: 'var(--status-building)', background: 'rgba(59, 130, 246, 0.1)' }}>{activeCount}</span>
        </span>
        
        <span className="hud-label" style={{ display: 'flex', gap: '3px' }}>
          V:
          <span className="hud-value" style={{ padding: '1px 5px', fontSize: '11px', color: 'var(--status-validated)', background: 'rgba(16, 185, 129, 0.1)' }}>{validatedCount}</span>
        </span>
        
        <span className="hud-label" style={{ display: 'flex', gap: '3px', marginRight: '8px' }}>
          K:
          <span className="hud-value" style={{ padding: '1px 5px', fontSize: '11px', color: 'var(--status-killed)', background: 'rgba(239, 68, 68, 0.1)' }}>{killedCount}</span>
        </span>

        <span className="top-dot" style={{ color: 'var(--ink-faint)' }}>•</span>

        {/* Global actions dock */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button 
            onClick={onSearchClick} 
            title="Search Notes (⌘K)" 
            style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', borderRadius: '50%', color: 'var(--ink-muted)', cursor: 'pointer' }}
            className="sidebar-folder-row"
          >
            <Search size={14} />
          </button>
          
          <button 
            onClick={onNewNote} 
            title="New Note (N)" 
            style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', borderRadius: '50%', color: 'var(--ink-muted)', cursor: 'pointer' }}
            className="sidebar-folder-row"
          >
            <Plus size={14} />
          </button>

          <button 
            onClick={onToggleTheme} 
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', borderRadius: '50%', color: 'var(--ink-muted)', cursor: 'pointer' }}
            className="sidebar-folder-row"
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          <button 
            onClick={() => alert("Settings panel coming soon!")} 
            title="Settings" 
            style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', borderRadius: '50%', color: 'var(--ink-muted)', cursor: 'pointer' }}
            className="sidebar-folder-row"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
