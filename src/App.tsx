import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { NoteList } from './components/NoteList';
import { NoteEditor } from './components/NoteEditor';
import { CommandPalette } from './components/CommandPalette';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Search, Plus, AlertCircle } from 'lucide-react';

type View = 'list' | 'editor';

function App() {
  const [notes, setNotes] = useState<any[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [view, setView] = useState<View>('list');

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // ⌘K shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((v) => !v);
      }
      // ⌘N new note
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        handleNewNote();
      }
      // Escape back to list
      if (e.key === 'Escape' && view === 'editor' && !isCommandPaletteOpen) {
        setView('list');
        setActiveNoteId(null);
      }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [view, isCommandPaletteOpen]);

  const fetchNotes = async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('notes')
      .select('*, note_tags(tags(name))')
      .order('updated_at', { ascending: false });
    if (data) setNotes(data);
    setLoading(false);
  };

  useEffect(() => { fetchNotes(); }, []);

  const handleSelectNote = (note: any) => {
    setActiveNoteId(note.id);
    setView('editor');
  };

  const handleNewNote = async () => {
    if (!isSupabaseConfigured) {
      // Demo mode: create a mock note
      const mock = { id: crypto.randomUUID(), title: '', content: '', updated_at: new Date().toISOString(), note_tags: [] };
      setNotes((prev) => [mock, ...prev]);
      setActiveNoteId(mock.id);
      setView('editor');
      return;
    }
    const { data } = await supabase
      .from('notes')
      .insert({ title: '', content: '' })
      .select()
      .single();
    if (data) {
      setNotes((prev) => [data, ...prev]);
      setActiveNoteId(data.id);
      setView('editor');
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!isSupabaseConfigured) {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      setActiveNoteId(null);
      setView('list');
      return;
    }
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) {
      alert(`Failed to delete: ${error.message}`);
      return;
    }
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setActiveNoteId(null);
    setView('list');
  };

  const handleGoHome = () => {
    setView('list');
    setActiveNoteId(null);
  };

  const activeNote = activeNoteId ? notes.find((n) => n.id === activeNoteId) ?? null : null;

  // Editor area variants
  const editorWrapperVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
    exit:   { opacity: 0, x: -10, transition: { duration: 0.18 } },
  };

  const listWrapperVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } },
    exit:   { opacity: 0, x: -16, transition: { duration: 0.18 } },
  };

  return (
    <div className="app-shell">
      {!isSupabaseConfigured && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: 'var(--ink-1)', color: 'var(--surface-1)',
          padding: '7px 16px', fontSize: '12px', fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: '8px',
          justifyContent: 'center', letterSpacing: '0.01em',
        }}>
          <AlertCircle size={13} />
          Add <strong>VITE_SUPABASE_URL</strong> and <strong>VITE_SUPABASE_KEY</strong> to connect your database.
        </div>
      )}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        notes={notes}
        onSelectNote={handleSelectNote}
        onNewNote={handleNewNote}
      />

      <Sidebar
        notes={notes}
        activeNote={activeNote}
        onSelectNote={handleSelectNote}
        onNewNote={handleNewNote}
        onGoHome={handleGoHome}
        onSearchClick={() => setIsCommandPaletteOpen(true)}
        activeTagFilter={activeTagFilter}
        onSelectTagFilter={setActiveTagFilter}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        activeView={view}
      />

      {/* Note List Panel — always rendered, slides out when editor is active */}
      <AnimatePresence mode="wait">
        {view === 'list' || true ? (
          <motion.div
            key="notelist"
            variants={listWrapperVariants}
            initial={false}
            animate={view === 'list' ? 'visible' : 'hidden'}
            style={{ flexShrink: 0, display: view === 'list' ? 'flex' : 'none' }}
          >
            {loading && notes.length === 0 ? (
              <div
                style={{
                  width: 'var(--notelist-w)',
                  background: 'var(--surface-1)',
                  borderRight: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--ink-4)',
                  fontSize: '13px',
                }}
              >
                Loading…
              </div>
            ) : (
              <NoteList
                notes={notes}
                onSelectNote={handleSelectNote}
                onNewNote={handleNewNote}
                activeTagFilter={activeTagFilter}
                onClearTagFilter={() => setActiveTagFilter(null)}
                onSelectTagFilter={setActiveTagFilter}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                activeNoteId={activeNoteId ?? undefined}
              />
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Editor pane */}
      <AnimatePresence mode="wait">
        {view === 'editor' && activeNote ? (
          <motion.div
            key={activeNote.id}
            variants={editorWrapperVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{ flex: 1, display: 'flex', minWidth: 0 }}
          >
            <NoteEditor
              note={activeNote}
              onNoteUpdated={fetchNotes}
              onDeleteNote={handleDeleteNote}
            />
          </motion.div>
        ) : view === 'list' ? null : (
          /* Empty editor state when no note is selected */
          <motion.div
            key="empty"
            variants={editorWrapperVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{ flex: 1, display: 'flex', minWidth: 0 }}
          >
            <div className="editor-pane">
              <div className="editor-empty-state">
                <div style={{
                  width: 48, height: 48, borderRadius: 'var(--r-lg)',
                  background: 'var(--surface-2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--ink-4)',
                }}>
                  <FileText size={22} strokeWidth={1.5} />
                </div>
                <div>
                  <div className="editor-empty-title">Your workspace</div>
                  <div className="editor-empty-subtitle">
                    Select a note to open it, or create a new one to start writing.
                  </div>
                </div>
                <div className="editor-empty-actions">
                  <button className="editor-empty-kbd" onClick={handleNewNote}>
                    <Plus size={14} />
                    New note
                  </button>
                  <button
                    className="editor-empty-kbd"
                    onClick={() => setIsCommandPaletteOpen(true)}
                  >
                    <Search size={14} />
                    Search  <kbd style={{ fontSize: '11px', color: 'var(--ink-4)' }}>⌘K</kbd>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
