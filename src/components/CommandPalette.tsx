import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText } from 'lucide-react';

export function CommandPalette({ notes, isOpen, onClose, onSelectNote }: any) {
  const [query, setQuery] = useState('');

  // Handle global keyboard shortcut (Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open palette - handled by parent via state, but we need a global listener in App or here
          // Wait, App needs to control isOpen. The global listener should be in App.tsx
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredNotes = notes.filter((n: any) => 
    (n.title && n.title.toLowerCase().includes(query.toLowerCase())) || 
    (n.content && n.content.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1000 }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              top: '15vh',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '90%',
              maxWidth: '600px',
              backgroundColor: 'var(--surface)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-sm)',
              zIndex: 1001,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', padding: 'var(--spacing-md)', borderBottom: '1px solid var(--hairline)' }}>
              <Search size={20} color="var(--ink-muted)" style={{ marginRight: '12px' }} />
              <input
                autoFocus
                type="text"
                placeholder="Search notes or jump to..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  fontSize: '16px',
                  width: '100%',
                  backgroundColor: 'transparent',
                  color: 'var(--ink)'
                }}
              />
            </div>
            
            <div style={{ maxHeight: '400px', overflowY: 'auto', padding: 'var(--spacing-xs)' }}>
              {query && filteredNotes.length === 0 ? (
                <div style={{ padding: 'var(--spacing-md)', textAlign: 'center', color: 'var(--ink-faint)' }}>
                  No results found.
                </div>
              ) : (
                filteredNotes.slice(0, 10).map((note: any) => (
                  <div
                    key={note.id}
                    onClick={() => {
                      onSelectNote(note);
                      onClose();
                      setQuery('');
                    }}
                    style={{
                      padding: 'var(--spacing-sm) var(--spacing-md)',
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: '2px',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--canvas-soft)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <FileText size={16} color="var(--ink-muted)" style={{ marginRight: '12px' }} />
                    <span style={{ fontWeight: 500 }}>{note.title || 'Untitled Note'}</span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
