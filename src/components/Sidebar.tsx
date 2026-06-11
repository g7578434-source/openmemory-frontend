/* eslint-disable @typescript-eslint/no-explicit-any */
import { Search, Settings, Folder, Plus, Sun, Moon, Files } from 'lucide-react';

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

  // Helper to count notes belonging to a specific tag
  const getCountForTag = (tag: string) => {
    return notes.filter(note => 
      note.note_tags?.some((nt: any) => {
        const name = nt.tags?.name;
        if (tag === 'system') {
          return name === 'system' || name === 'protocol';
        }
        return name === tag;
      })
    ).length;
  };

  const renderFolder = (label: string, tag: string) => {
    const count = getCountForTag(tag);
    const isActive = activeTagFilter === tag;
    
    return (
      <button
        key={tag}
        className={`sidebar-list-item ${isActive ? 'active' : ''}`}
        onClick={() => {
          onSelectTagFilter(tag);
          onGoHome();
        }}
      >
        <Folder aria-hidden="true" size={13} className="item-icon" />
        <span className="item-text">{label}</span>
        <span className="folder-count">{count}</span>
      </button>
    );
  };

  return (
    <div className="sidebar-left">
      {/* App Header (Name and Note Count) */}
      <div className="profile-dropdown-container">
        <button className="profile-dropdown-btn" style={{ cursor: 'default' }}>
          <div className="avatar-container" style={{ backgroundColor: 'var(--primary)' }}>
            <span className="avatar-initial" style={{ color: 'var(--on-primary)' }}>M</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
            <span className="profile-name" style={{ fontSize: '14px', lineHeight: 1.2 }}>OpenMemory</span>
            <span style={{ fontSize: '11px', color: 'var(--ink-faint)', marginTop: '2px' }}>
              {notes.length} {notes.length === 1 ? 'note' : 'notes'} saved
            </span>
          </div>
        </button>
      </div>

      {/* Primary Action: Create Note */}
      <div className="sidebar-action-container">
        <button className="sidebar-create-btn" onClick={onNewNote}>
          <Plus aria-hidden="true" size={16} />
          <span>Create Note</span>
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
        {/* Group 1: Research Flow */}
        <div className="sidebar-folder-group">
          {renderFolder('Raw Ideas', 'raw-idea')}
          {renderFolder('Awaiting Test', 'awaiting-test')}
          {renderFolder('Validated', 'validated')}
          {renderFolder('Killed Ideas', 'killed')}
        </div>

        <hr className="sidebar-divider" />

        {/* Group 2: Log Notes */}
        <div className="sidebar-folder-group">
          {renderFolder('Research Logs', 'research-log')}
          {renderFolder('Session Logs', 'session-log')}
        </div>

        <hr className="sidebar-divider" />

        {/* Group 3: Setup & Systems */}
        <div className="sidebar-folder-group">
          {renderFolder('Templates', 'template')}
          {renderFolder('System', 'system')}
        </div>

        <hr className="sidebar-divider" />

        {/* Group 4: All Notes Fallback */}
        <div className="sidebar-folder-group">
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
