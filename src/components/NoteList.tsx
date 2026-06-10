import { motion } from 'framer-motion';
import { PlusCircle } from 'lucide-react';

const getBadgeColor = (tagName: string) => {
  const colors = ['badge-sky', 'badge-purple', 'badge-pink', 'badge-teal', 'badge-orange'];
  return colors[tagName.length % colors.length];
};

export function NoteList({ notes, onSelectNote, onNewNote }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      style={{ width: '100%', height: '100%' }}
    >
      <div style={{ padding: 'var(--spacing-xl) var(--spacing-lg)', borderBottom: '1px solid var(--hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="heading-2">All Notes</h1>
        <button className="btn-primary" onClick={onNewNote} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PlusCircle size={16} /> New Note
        </button>
      </div>

      <div>
        {notes.length === 0 ? (
          <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--ink-faint)' }}>
            <p>No notes found. Create your first memory!</p>
          </div>
        ) : (
          notes.map((note: any) => (
            <div key={note.id} className="note-list-item" onClick={() => onSelectNote(note)}>
              <div className="note-list-title">{note.title || 'Untitled Note'}</div>
              <div className="note-list-preview">
                {note.content ? note.content.substring(0, 100) : 'Empty note...'}
              </div>
              {note.note_tags && note.note_tags.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  {note.note_tags.map((nt: any, idx: number) => {
                    if (!nt.tags) return null;
                    return (
                      <span key={idx} className={`badge-pill ${getBadgeColor(nt.tags.name)}`}>
                        #{nt.tags.name}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
