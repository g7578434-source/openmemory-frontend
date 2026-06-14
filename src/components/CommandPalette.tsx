import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText, Plus, ArrowRight, Hash } from 'lucide-react';
import { getTagColor } from './NoteList';

function stripHtml(html: string): string {
  if (!html) return '';
  return new DOMParser().parseFromString(html, 'text/html').body.textContent || '';
}

interface CommandPaletteProps {
  notes: any[];
  isOpen: boolean;
  onClose: () => void;
  onSelectNote: (note: any) => void;
  onNewNote: () => void;
}

type ResultItem =
  | { type: 'note'; note: any }
  | { type: 'action'; id: string; label: string; icon: React.ReactNode; shortcut?: string; action: () => void };

export function CommandPalette({ notes, isOpen, onClose, onSelectNote, onNewNote }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset on open/close
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setFocusedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen]);

  // Build result list
  const results: ResultItem[] = [];

  const matchedNotes = notes.filter((n) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      n.title?.toLowerCase().includes(q) ||
      stripHtml(n.content).toLowerCase().includes(q)
    );
  }).slice(0, 7);

  if (matchedNotes.length > 0) {
    matchedNotes.forEach((note) => results.push({ type: 'note', note }));
  }

  // Actions section (always shown when query is empty or matches)
  const actions: ResultItem[] = [
    {
      type: 'action',
      id: 'new',
      label: 'New note',
      icon: <Plus size={14} />,
      shortcut: '⌘N',
      action: () => { onNewNote(); onClose(); },
    },
  ];

  if (!query.trim() || 'new note'.includes(query.toLowerCase())) {
    actions.forEach((a) => results.push(a));
  }

  const totalItems = results.length;

  const runFocused = useCallback(() => {
    const item = results[focusedIndex];
    if (!item) return;
    if (item.type === 'note') {
      onSelectNote(item.note);
      onClose();
    } else {
      item.action();
    }
    setQuery('');
  }, [results, focusedIndex, onSelectNote, onClose]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((i) => Math.min(i + 1, totalItems - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        runFocused();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose, totalItems, runFocused]);

  // Reset focused when results change
  useEffect(() => { setFocusedIndex(0); }, [query]);

  // Scroll focused item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${focusedIndex}"]`) as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [focusedIndex]);

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const paletteVariants = {
    hidden: { opacity: 0, scale: 0.96, y: -12 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] } },
    exit:   { opacity: 0, scale: 0.96, y: -8, transition: { duration: 0.12 } },
  };

  // Highlight matching text
  function hl(text: string) {
    if (!query.trim()) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="search-highlight">{text.slice(idx, idx + query.length)}</mark>
        {text.slice(idx + query.length)}
      </>
    );
  }

  let noteItemIndex = -1;
  let actionItemIndex = -1;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="cmd-backdrop"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />

          <motion.div
            className="cmd-palette"
            variants={paletteVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
          >
            {/* Search input */}
            <div className="cmd-search-row">
              <Search size={16} className="cmd-search-icon" />
              <input
                ref={inputRef}
                type="text"
                className="cmd-search-input"
                placeholder="Search notes or run a command..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search"
                autoComplete="off"
                spellCheck={false}
              />
              <kbd className="cmd-kbd-hint">esc</kbd>
            </div>

            {/* Results */}
            <div className="cmd-results" ref={listRef} role="listbox">
              {totalItems === 0 && (
                <div className="cmd-no-results">No results for &ldquo;{query}&rdquo;</div>
              )}

              {/* Notes section */}
              {matchedNotes.length > 0 && (
                <>
                  <div className="cmd-section-label">Notes</div>
                  {matchedNotes.map((note) => {
                    noteItemIndex++;
                    const myIndex = noteItemIndex;
                    const tags: string[] = note.note_tags
                      ?.filter((nt: any) => nt.tags?.name)
                      .map((nt: any) => nt.tags.name) || [];
                    return (
                      <div
                        key={note.id}
                        data-index={myIndex}
                        className={`cmd-item ${focusedIndex === myIndex ? 'focused' : ''}`}
                        onClick={() => { onSelectNote(note); onClose(); setQuery(''); }}
                        onMouseEnter={() => setFocusedIndex(myIndex)}
                        role="option"
                        aria-selected={focusedIndex === myIndex}
                      >
                        <div className="cmd-item-icon">
                          <FileText size={14} />
                        </div>
                        <div className="cmd-item-body">
                          <div className="cmd-item-title">{hl(note.title || 'Untitled Note')}</div>
                          {tags.length > 0 && (
                            <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                              {tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className={`note-tag-pill ${getTagColor(tag)}`}
                                  style={{ fontSize: '10px' }}
                                >
                                  <Hash size={8} style={{ display: 'inline', marginRight: '2px' }} />
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <ArrowRight size={13} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
                      </div>
                    );
                  })}
                </>
              )}

              {/* Actions section */}
              {actions.some((a) => !query.trim() || 'new note'.includes(query.toLowerCase())) && (
                <>
                  <div className="cmd-section-label">Actions</div>
                  {actions.map((action) => {
                    if (action.type !== 'action') return null;
                    if (query.trim() && !'new note'.includes(query.toLowerCase())) return null;
                    actionItemIndex = matchedNotes.length + (actionItemIndex === -1 ? 0 : actionItemIndex + 1);
                    const myIndex = matchedNotes.length;
                    return (
                      <div
                        key={action.id}
                        data-index={myIndex}
                        className={`cmd-item ${focusedIndex === myIndex ? 'focused' : ''}`}
                        onClick={action.action}
                        onMouseEnter={() => setFocusedIndex(myIndex)}
                        role="option"
                        aria-selected={focusedIndex === myIndex}
                      >
                        <div className="cmd-item-icon">{action.icon}</div>
                        <div className="cmd-item-body">
                          <div className="cmd-item-title">{action.label}</div>
                        </div>
                        {action.shortcut && (
                          <kbd className="cmd-item-kbd">{action.shortcut}</kbd>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Footer hints */}
            <div className="cmd-footer">
              <span className="cmd-footer-hint">
                <kbd className="cmd-kbd-hint">↑↓</kbd> Navigate
              </span>
              <span className="cmd-footer-hint">
                <kbd className="cmd-kbd-hint">↵</kbd> Open
              </span>
              <span className="cmd-footer-hint">
                <kbd className="cmd-kbd-hint">esc</kbd> Dismiss
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
