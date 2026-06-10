import { Home, Search, Settings, Pin, FileText, Folder, Plus, Sun, Moon } from 'lucide-react';

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
  onSelectNote, 
  onNewNote, 
  onGoHome, 
  onSearchClick,
  activeTagFilter,
  onSelectTagFilter,
  theme,
  onToggleTheme
}: SidebarProps) {
  // Extract top 5 notes for the recent list
  const recentNotes = notes.slice(0, 5);

  // Extract unique tags/collections from notes
  const collections = Array.from(
    new Set(
      notes
        .flatMap((note) => note.note_tags?.map((nt: any) => nt.tags?.name))
        .filter(Boolean)
    )
  ).slice(0, 5);

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
          <Plus size={16} />
          <span>Create Note</span>
        </button>
      </div>

      {/* Inline Search / Ask Box */}
      <div className="sidebar-search-container">
        <button className="sidebar-search-box" onClick={onSearchClick}>
          <Search size={14} />
          <span>Search or ask your Mem</span>
          <span className="search-shortcut">⌘K</span>
        </button>
      </div>

      {/* Navigation Links */}
      <div className="sidebar-nav-section">
        <button 
          className={`nav-item ${!activeNote && !activeTagFilter ? 'active' : ''}`} 
          onClick={() => {
            onSelectTagFilter(null);
            onGoHome();
          }}
        >
          <Home size={15} />
          <span>Home</span>
        </button>
      </div>

      {/* Pinned Section */}
      <div className="sidebar-group">
        <div className="sidebar-group-header">
          <Pin size={12} />
          <span>Pinned</span>
        </div>
        <div className="sidebar-group-empty">
          Notes and collections appear here
        </div>
      </div>

      {/* Recent Notes Section */}
      <div className="sidebar-group">
        <div className="sidebar-group-header">
          <FileText size={12} />
          <span>Notes</span>
        </div>
        <div className="sidebar-group-list">
          {recentNotes.length === 0 ? (
            <div className="sidebar-group-empty">No recent notes</div>
          ) : (
            recentNotes.map((note) => (
              <button
                key={note.id}
                className={`sidebar-list-item ${activeNote?.id === note.id ? 'active' : ''}`}
                onClick={() => {
                  onSelectTagFilter(null);
                  onSelectNote(note);
                }}
              >
                <FileText size={13} className="item-icon" />
                <span className="item-text">{note.title || 'Untitled Note'}</span>
              </button>
            ))
          )}
          {notes.length > 5 && (
            <button 
              className="sidebar-see-all-btn" 
              onClick={() => {
                onSelectTagFilter(null);
                onGoHome();
              }}
            >
              See all
            </button>
          )}
        </div>
      </div>

      {/* Collections Section */}
      <div className="sidebar-group">
        <div className="sidebar-group-header">
          <Folder size={12} />
          <span>Collections</span>
        </div>
        <div className="sidebar-group-list">
          {collections.length === 0 ? (
            <div className="sidebar-group-empty">No collections yet</div>
          ) : (
            collections.map((tag: any) => (
              <button
                key={tag}
                className={`sidebar-list-item ${activeTagFilter === tag ? 'active' : ''}`}
                onClick={() => {
                  onSelectTagFilter(tag);
                  onGoHome();
                }}
              >
                <Folder size={13} className="item-icon" />
                <span className="item-text">#{tag}</span>
              </button>
            ))
          )}
          {collections.length > 0 && (
            <button className="sidebar-see-all-btn" onClick={() => {}}>
              See all
            </button>
          )}
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
            <Settings size={15} style={{ marginRight: '8px' }} />
            <span>Settings</span>
          </button>
          
          <button 
            className="theme-toggle-btn" 
            onClick={onToggleTheme} 
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </div>
    </div>
  );
}
