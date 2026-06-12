/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText } from 'lucide-react';
import { getDisplayTitle } from '../lib/noteTitleHelper';

export function CommandPalette({ notes, isOpen, onClose, onSelectNote }: any) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredNotes = notes.filter((n: any) => 
    (n.title && n.title.toLowerCase().includes(query.toLowerCase())) || 
    (n.content && n.content.toLowerCase().includes(query.toLowerCase()))
  );

  const displayNotes = filteredNotes.slice(0, 10);

  // Reset selectedIndex and query when palette is opened
  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
      setQuery('');
    }
  }, [isOpen]);

  // Reset selectedIndex when query changes is now handled in onChange to avoid useEffect setState warning

  // Handle global keyboard shortcuts & navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }

      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, displayNotes.length));
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + displayNotes.length) % Math.max(1, displayNotes.length));
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (displayNotes.length > 0 && displayNotes[selectedIndex]) {
          onSelectNote(displayNotes[selectedIndex]);
          onClose();
          setQuery('');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, displayNotes, selectedIndex, onSelectNote]);

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
              <Search aria-hidden="true" size={20} color="var(--ink-muted)" style={{ marginRight: '12px' }} />
              <input
                autoFocus
                type="text"
                role="combobox"
                aria-expanded={isOpen}
                aria-autocomplete="list"
                aria-controls="command-results-list"
                aria-activedescendant={displayNotes.length > 0 ? `command-option-${selectedIndex}` : undefined}
                placeholder="Search notes or jump to..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
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
            
            <div 
              id="command-results-list"
              role="listbox"
              aria-label="Search results"
              style={{ maxHeight: '400px', overflowY: 'auto', padding: 'var(--spacing-xs)' }}
            >
              {query && displayNotes.length === 0 ? (
                <div style={{ padding: 'var(--spacing-md)', textAlign: 'center', color: 'var(--ink-faint)' }} role="status">
                  No results found.
                </div>
              ) : (
                displayNotes.map((note: any, idx: number) => (
                  <button
                    key={note.id}
                    id={`command-option-${idx}`}
                    role="option"
                    aria-selected={idx === selectedIndex}
                    onClick={() => {
                      onSelectNote(note);
                      onClose();
                      setQuery('');
                    }}
                    style={{
                      width: '100%',
                      padding: 'var(--spacing-sm) var(--spacing-md)',
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: '2px',
                      textAlign: 'left',
                      border: 'none',
                      outline: 'none',
                      backgroundColor: idx === selectedIndex ? 'var(--canvas-soft)' : 'transparent',
                      boxShadow: idx === selectedIndex ? 'inset 3px 0 0 0 var(--primary), 0 0 8px rgba(124, 58, 237, 0.08)' : 'none',
                      transition: 'background-color 0.15s ease, box-shadow 0.15s ease'
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <FileText aria-hidden="true" size={16} color="var(--ink-muted)" style={{ marginRight: '12px', flexShrink: 0 }} />
                    <span style={{ fontWeight: 500, color: 'var(--ink)' }}>{getDisplayTitle(note)}</span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

