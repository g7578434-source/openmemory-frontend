/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from 'react';
import { Search, Settings, Folder, Plus, Sun, Moon, Inbox, Files } from 'lucide-react';
import { supabase } from '../lib/supabase';

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

/** "rejected-ideas" → "Rejected Ideas" */
function formatFolderName(tag: string): string {
  return tag
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

interface SidebarProps {
  notes: any[];
  activeNote: any;
  onSelectNote: (note: any) => void;
  onNewNote: () => void;
  onGoHome: () => void;
  onSearchClick: () => void;
  activeTagFilter: string | null;
  onSelectTagFilter: (tag: string | null) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export function Sidebar({
  notes,
  activeNote,
  onNewNote,
  onGoHome,
  onSearchClick,
  activeTagFilter,
  onSelectTagFilter,
  theme,
  onToggleTheme
}: SidebarProps) {

  const [folders, setFolders] = useState<any[]>([]);

  useEffect(() => {
    async function loadFolders() {
      const { data } = await supabase
        .from('tags')
        .select('name, note_tags(count)')
        .order('name');
      if (data) {
        setFolders(data);
      }
    }
    loadFolders();
  }, [notes]);

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

  const hasAnyFolders = (folders || []).length > 0;

  return (
    <div className="sidebar-left">
      {/* App Header (Name and Note Count) */}
      <div className="profile-dropdown-container">
        <button className="profile-dropdown-btn" style={{ cursor: 'default' }}>
          <div className="avatar-container">
            <span className="avatar-initial" style={{ color: 'var(--on-primary)' }}>M</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
            <span className="profile-name">OpenMemory</span>
            <span style={{ fontSize: '11px', color: 'var(--ink-faint)', marginTop: '2px' }}>
              {notes.length} {notes.length === 1 ? 'note' : 'notes'} saved
            </span>
          </div>
        </button>
      </div>

      {/* Primary Action: Create Note */}
      <div className="sidebar-action-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          className="sidebar-create-btn"
          onClick={onNewNote}
          style={{
            justifyContent: 'flex-start',
            paddingLeft: '14px',
            color: 'var(--ink-muted)',
            fontWeight: 400,
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <Plus aria-hidden="true" size={14} style={{ color: 'var(--ink-faint)', marginRight: '2px' }} />
          <span>New note...</span>
        </button>
      </div>

      {/* Inline Search / Ask Box */}
      <div className="sidebar-search-container">
        <button className="sidebar-search-box" onClick={onSearchClick}>
          <Search aria-hidden="true" size={14} />
          <span>Search</span>
          <span className="search-shortcut">⌘K</span>
        </button>
      </div>

      {/* Folder Navigation */}
      <div className="sidebar-folders-container" style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
        {!hasAnyFolders ? (
          <div className="sidebar-group-empty" style={{ padding: '16px 10px', textAlign: 'left' }}>
            Your mind is clear. What’s on your mind?
          </div>
        ) : (
          <>
            {/* All Notes Fallback */}
            <div className="sidebar-folder-group" style={{ marginBottom: '8px' }}>
              <button
                className={`sidebar-list-item ${!activeNote && !activeTagFilter ? 'active' : ''}`}
                onClick={() => {
                  onSelectTagFilter(null);
                  onGoHome();
                }}
              >
                <Files aria-hidden="true" size={13} className="item-icon" />
                <span className="item-text">All Notes</span>
                <span className="folder-count">{notes.length}</span>
              </button>
            </div>

            <div className="sidebar-section-divider" style={{ margin: '8px 12px 12px 12px' }} />

            {FOLDER_GROUPS.map(({ section, tags }, index) => {
              const hasVisibleTag = tags.some(t => tagMap.has(t) || (tagMap.get(t) ?? 0) > 0);
              if (!hasVisibleTag) return null;

              return (
                <div key={section}>
                  {index > 0 && <div className="sidebar-section-divider" />}
                  <div className="sidebar-folder-section">
                    <span className="sidebar-section-label">{section}</span>
                    {tags.map(tagName => {
                      const count = tagMap.get(tagName) ?? 0;
                      const isActive = activeTagFilter === tagName;
                      return (
                        <button
                          key={tagName}
                          className={`sidebar-folder-row ${isActive ? 'active' : ''}`}
                          onClick={() => {
                            onSelectTagFilter(tagName);
                            onGoHome();
                          }}
                        >
                          <span className="folder-icon">
                            {isActive ? '▾' : '▸'}
                          </span>
                          <span className="folder-label">{formatFolderName(tagName)}</span>
                          {count > 0 && (
                            <span className="folder-count">{count}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {otherTags.length > 0 && (
              <>
                <div className="sidebar-section-divider" />
                <div className="sidebar-folder-section">
                  <span className="sidebar-section-label">OTHER</span>
                  {otherTags.map(tagName => {
                    const count = tagMap.get(tagName) ?? 0;
                    const isActive = activeTagFilter === tagName;
                    return (
                      <button
                        key={tagName}
                        className={`sidebar-folder-row ${isActive ? 'active' : ''}`}
                        onClick={() => {
                          onSelectTagFilter(tagName);
                          onGoHome();
                        }}
                      >
                        <span className="folder-icon">
                          {isActive ? '▾' : '▸'}
                        </span>
                        <span className="folder-label">{formatFolderName(tagName)}</span>
                        {count > 0 && (
                          <span className="folder-count">{count}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Settings & Theme Toggle */}
      <div className="sidebar-footer" style={{ borderTop: '1px solid var(--hairline)', padding: '12px 8px 0 8px' }}>
        <div style={{ display: 'flex', gap: '8px', width: '100%', alignItems: 'center' }}>
          <button
            className="nav-item settings-nav-btn"
            style={{ flex: 1, margin: 0, justifyContent: 'flex-start', padding: '8px 12px' }}
            onClick={() => alert("Settings panel coming soon!")}
          >
            <Settings aria-hidden="true" size={15} style={{ marginRight: '8px' }} />
            <span>Settings</span>
          </button>

          <button
            className="theme-toggle-btn"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun aria-hidden="true" size={15} /> : <Moon aria-hidden="true" size={15} />}
          </button>
        </div>
      </div>
    </div>
  );
}
