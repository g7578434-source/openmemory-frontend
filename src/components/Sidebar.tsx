import { FileText, Search, PlusCircle, Settings } from 'lucide-react';

export function Sidebar({ notes, onSelectNote, onNewNote, activeNoteId }: any) {
  return (
    <div className="sidebar">
      <div style={{ padding: '0 var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
        <h2 className="title" style={{ fontSize: '15px' }}>OpenMemory</h2>
      </div>
      
      <div style={{ padding: '0 var(--spacing-xs)' }}>
        <button className="nav-item" style={{ width: '100%', textAlign: 'left' }} onClick={onNewNote}>
          <PlusCircle size={16} />
          New Note
        </button>
        <button className="nav-item" style={{ width: '100%', textAlign: 'left' }}>
          <Search size={16} />
          Search
        </button>
      </div>

      <div style={{ marginTop: 'var(--spacing-lg)' }}>
        <div className="eyebrow" style={{ padding: '0 var(--spacing-md)', marginBottom: 'var(--spacing-xs)', color: 'var(--ink-faint)' }}>
          Private
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {notes.map((note: any) => (
            <button 
              key={note.id}
              className={`nav-item ${activeNoteId === note.id ? 'active' : ''}`}
              style={{ width: '100%', textAlign: 'left' }}
              onClick={() => onSelectNote(note)}
            >
              <FileText size={16} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {note.title || 'Untitled'}
              </span>
            </button>
          ))}
        </div>
      </div>
      
      <div style={{ marginTop: 'auto', padding: '0 var(--spacing-xs)' }}>
        <button className="nav-item" style={{ width: '100%', textAlign: 'left' }}>
          <Settings size={16} />
          Settings
        </button>
      </div>
    </div>
  );
}
