import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, X, Hash, FileText } from 'lucide-react';

// ---- helpers ----------------------------------------------------------------

const TAG_COLORS = ['tag-amber', 'tag-sky', 'tag-teal', 'tag-rose', 'tag-violet', 'tag-stone'];

export function getTagColor(tagName: string): string {
  return TAG_COLORS[tagName.length % TAG_COLORS.length];
}

function formatTime(dateString: string): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (d.toDateString() === now.toDateString()) {
    const h = d.getHours() % 12 || 12;
    const m = d.getMinutes().toString().padStart(2, '0');
    const ap = d.getHours() >= 12 ? 'pm' : 'am';
    return `${h}:${m}${ap}`;
  }
  if (diff < 7 * 86400) {
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function stripHtml(html: string): string {
  if (!html) return '';
  return new DOMParser().parseFromString(html, 'text/html').body.textContent || '';
}

// Highlight matching substring within text
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="search-highlight">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// ---- component --------------------------------------------------------------

interface NoteListProps {
  notes: any[];
  onSelectNote: (note: any) => void;
  onNewNote: () => void;
  activeTagFilter: string | null;
  onClearTagFilter: () => void;
  onSelectTagFilter?: (tag: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeNoteId?: string;
}

export function NoteList({
  notes,
  onSelectNote,
  onNewNote,
  activeTagFilter,
  onClearTagFilter,
  onSelectTagFilter,
  searchQuery,
  onSearchChange,
  activeNoteId,
}: NoteListProps) {

  // Derive all unique tags from notes
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach((note) => {
      note.note_tags?.forEach((nt: any) => {
        if (nt.tags?.name) tagSet.add(nt.tags.name);
      });
    });
    return Array.from(tagSet);
  }, [notes]);

  // Filter notes by tag + search query
  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      if (activeTagFilter) {
        const hasTag = note.note_tags?.some((nt: any) => nt.tags?.name === activeTagFilter);
        if (!hasTag) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const titleMatch = note.title?.toLowerCase().includes(q);
        const contentMatch = stripHtml(note.content).toLowerCase().includes(q);
        if (!titleMatch && !contentMatch) return false;
      }
      return true;
    });
  }, [notes, activeTagFilter, searchQuery]);

  const listVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.04 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
    exit:   { opacity: 0, scale: 0.97, transition: { duration: 0.15 } },
  };

  return (
    <div className="notelist-panel">
      {/* Header */}
      <div className="notelist-header">
        <div className="notelist-title-row">
          <span className="notelist-title">
            {activeTagFilter ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Hash size={14} style={{ color: 'var(--accent)' }} />
                {activeTagFilter}
              </span>
            ) : 'Notes'}
          </span>
          <span className="notelist-count">{filteredNotes.length}</span>
        </div>

        {/* Search */}
        <div className="notelist-search">
          <Search size={13} className="notelist-search-icon" />
          <input
            type="text"
            className="notelist-search-input"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search notes"
          />
          {searchQuery && (
            <button
              className="notelist-search-clear"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
            >
              <X size={10} />
            </button>
          )}
        </div>
      </div>

      {/* Tag cloud */}
      {allTags.length > 0 && (
        <div className="tag-cloud-section">
          <div className="tag-cloud-label">Filter by tag</div>
          <div className="tag-cloud" role="group" aria-label="Tag filters">
            {activeTagFilter && (
              <button
                className="tag-chip active"
                onClick={onClearTagFilter}
                aria-pressed="true"
              >
                <X size={10} />
                Clear
              </button>
            )}
            {allTags.map((tag) => (
              <button
                key={tag}
                className={`tag-chip ${activeTagFilter === tag ? 'active' : ''}`}
                onClick={() => {
                  if (activeTagFilter === tag) {
                    onClearTagFilter();
                  } else {
                    onClearTagFilter();
                    onSelectTagFilter?.(tag);
                  }
                }}
                aria-pressed={activeTagFilter === tag}
              >
                <span
                  className="tag-chip-dot"
                  style={{ backgroundColor: `var(--accent)` }}
                />
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Notes scroll area */}
      <div className="notelist-scroll">
        {filteredNotes.length === 0 ? (
          <div className="notelist-empty">
            <div className="notelist-empty-icon">
              <FileText size={18} />
            </div>
            <span className="notelist-empty-label">
              {searchQuery || activeTagFilter
                ? 'No notes match your filter'
                : 'No notes yet. Create your first one.'}
            </span>
            {!searchQuery && !activeTagFilter && (
              <button
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '7px 14px', borderRadius: 'var(--r-sm)',
                  background: 'var(--accent-soft)', color: 'var(--accent)',
                  fontSize: '13px', fontWeight: 500,
                }}
                onClick={onNewNote}
              >
                <Plus size={14} />
                New note
              </button>
            )}
          </div>
        ) : (
          <motion.div
            variants={listVariants}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence>
              {filteredNotes.map((note) => {
                const rawPreview = stripHtml(note.content);
                const tags: string[] = note.note_tags
                  ?.filter((nt: any) => nt.tags?.name)
                  .map((nt: any) => nt.tags.name) || [];

                return (
                  <motion.div
                    key={note.id}
                    variants={itemVariants}
                    exit="exit"
                    layout
                    className={`note-card ${activeNoteId === note.id ? 'active' : ''}`}
                    onClick={() => onSelectNote(note)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && onSelectNote(note)}
                    aria-label={`Open note: ${note.title || 'Untitled Note'}`}
                  >
                    <div className="note-card-title">
                      <Highlight text={note.title || 'Untitled Note'} query={searchQuery} />
                    </div>
                    {rawPreview && (
                      <div className="note-card-preview">
                        <Highlight
                          text={rawPreview.slice(0, 120)}
                          query={searchQuery}
                        />
                      </div>
                    )}
                    <div className="note-card-footer">
                      <div className="note-card-tags">
                        {tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className={`note-tag-pill ${getTagColor(tag)}`}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                      <span className="note-card-time">{formatTime(note.updated_at)}</span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* New note shortcut at bottom of list */}
            <button className="notelist-new-btn" onClick={onNewNote}>
              <Plus size={14} />
              New note
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}


