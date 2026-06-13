import { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { NotesFeed } from './components/NotesFeed';
import { NoteEditor } from './components/NoteEditor';
import { CommandPalette } from './components/CommandPalette';
import { supabase } from './lib/supabase';
import { X, Menu, Search, ArrowLeft } from 'lucide-react';
import { getDisplayTitle } from './lib/noteTitleHelper';
import { getSidebarSections, saveSidebarSections, DEFAULT_FOLDER_GROUPS } from './lib/userPreferences';

function App() {
  const [notes, setNotes] = useState<any[]>([]);
  const [openNotes, setOpenNotes] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>('home'); // 'home' or uuid string
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [searchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [capsule, setCapsule] = useState<any | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarSections, setSidebarSections] = useState<any[]>(DEFAULT_FOLDER_GROUPS);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return 'light'; // Default to premium light mode
  });

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleNewNote = () => {
    // If an empty draft note already exists, just switch to it
    const existingDraft = openNotes.find(n => n.id.startsWith('draft-'));
    if (existingDraft) {
      setActiveTab(existingDraft.id);
      setIsSidebarOpen(false);
      return;
    }

    const draftId = `draft-${Date.now()}`;
    const newDraft = {
      id: draftId,
      title: '',
      content: '',
      status: 'note',
      note_tags: []
    };

    setNotes(prev => [newDraft, ...prev]);
    setOpenNotes(prev => [...prev, newDraft]);
    setActiveTab(draftId);
    setIsSidebarOpen(false);
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Keep track of the previous active tab to clean up empty drafts
  const prevActiveTabRef = useRef<string>('home');

  useEffect(() => {
    const prevActiveTab = prevActiveTabRef.current;
    prevActiveTabRef.current = activeTab;

    if (prevActiveTab.startsWith('draft-') && prevActiveTab !== activeTab) {
      const draftNote = openNotes.find(n => n.id === prevActiveTab);
      const isEmpty = !draftNote?.title?.trim() && (!draftNote?.content || draftNote.content === '' || draftNote.content === '<p></p>');
      if (isEmpty) {
        setNotes(prev => prev.filter(n => n.id !== prevActiveTab));
        setOpenNotes(prev => prev.filter(n => n.id !== prevActiveTab));
      }
    }
  }, [activeTab, openNotes]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command Palette (Cmd+K / Ctrl+K)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
        return;
      }

      // Escape to close editor modal or discard empty draft
      if (e.key === 'Escape') {
        
        if (activeTab.startsWith('draft-')) {
          const draftNote = openNotes.find(n => n.id === activeTab);
          const isEmpty = !draftNote?.title?.trim() && (!draftNote?.content || draftNote.content === '' || draftNote.content === '<p></p>');
          if (isEmpty) {
            e.preventDefault();
            // Discard draft
            setNotes(prev => prev.filter(n => n.id !== activeTab));
            setOpenNotes(prev => prev.filter(n => n.id !== activeTab));
            setActiveTab('home');
            return;
          }
        }
        
        if (activeTab !== 'home') {
          e.preventDefault();
          setActiveTab('home');
          return;
        }
      }

      // Keyboard navigation shortcuts when not typing
      const activeEl = document.activeElement;
      const isEditing = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.hasAttribute('contenteditable') ||
        activeEl.closest('.ProseMirror')
      );

      if (!isEditing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // New Note (N key)
        if (e.key.toLowerCase() === 'n') {
          e.preventDefault();
          handleNewNote();
          return;
        }

        // Jump to Graveyard (G key)
        if (e.key.toLowerCase() === 'g') {
          e.preventDefault();
          document.querySelector('.graveyard-section')?.scrollIntoView({ behavior: 'smooth' });
          return;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, openNotes, notes]);

  const fetchNotes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('notes')
      .select('*, note_tags(tags(name))')
      .order('updated_at', { ascending: false });

    if (data) {
      // Preserve any local in-memory draft notes
      const drafts = notes.filter(n => n.id.startsWith('draft-'));
      setNotes([...drafts, ...data]);

      // Sync openNotes with fresh db contents while preserving drafts
      setOpenNotes(prev =>
        prev.map(openNote => {
          if (openNote.id.startsWith('draft-')) return openNote;
          const fresh = data.find(d => d.id === openNote.id);
          return fresh ? fresh : openNote;
        })
      );
    }
    setLoading(false);
  };

  const fetchCapsule = async () => {
    try {
      const { data, error } = await supabase
        .from('context_capsules')
        .select('*')
        .eq('project_name', 'micro-saas-research')
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // Auto-initialize a default capsule if none exists
        const defaultCapsule = {
          session_number: 8,
          validated_count: 0,
          raw_ideas_count: 3,
          pipeline: [
            {
              rank: 1,
              tool_name: "SEO Blog Writer AI",
              score: 39,
              niche: "B2B",
              status: "raw-idea",
              scores: { traffic: 8, cpc: 8, repeat: 7, share: 8, build: 8 }
            },
            {
              rank: 2,
              tool_name: "Legal Contract Analyzer",
              score: 36,
              niche: "Legal",
              status: "raw-idea",
              scores: { traffic: 7, cpc: 8, repeat: 6, share: 7, build: 8 }
            },
            {
              rank: 3,
              tool_name: "SaaS Billing Auditor",
              score: 33,
              niche: "Finance",
              status: "raw-idea",
              scores: { traffic: 6, cpc: 7, repeat: 6, share: 6, build: 8 }
            }
          ],
          next_actions: [
            "Test landing page for Legal Contract Analyzer",
            "Source B2B list for SaaS Billing Auditor"
          ]
        };

        const { error: insertErr } = await supabase
          .from('context_capsules')
          .insert({
            project_name: 'micro-saas-research',
            state_data: defaultCapsule
          });

        if (insertErr) throw insertErr;
        setCapsule(defaultCapsule);
      } else {
        setCapsule(data.state_data);
      }
    } catch (err) {
      console.error("Error loading capsule:", err);
    }
  };

  const saveCapsule = async (newState: any) => {
    try {
      const { error } = await supabase
        .from('context_capsules')
        .upsert(
          { project_name: 'micro-saas-research', state_data: newState },
          { onConflict: 'project_name' }
        );

      if (error) throw error;
      setCapsule(newState);
    } catch (err: any) {
      console.error("Error saving capsule:", err);
      alert(`Error saving capsule: ${err.message}`);
    }
  };

  useEffect(() => {
    fetchNotes();
    fetchCapsule();

    // Load custom sidebar folders from Supabase
    async function loadSidebarPrefs() {
      const sections = await getSidebarSections();
      setSidebarSections(sections);
    }
    loadSidebarPrefs();
  }, []);

  const handleSaveSidebarSections = async (newSections: any[]) => {
    setSidebarSections(newSections);
    await saveSidebarSections(newSections);
  };

  const handleSelectNote = (note: any) => {
    if (!openNotes.some(n => n.id === note.id)) {
      setOpenNotes([...openNotes, note]);
    }
    setActiveTab(note.id);
    setIsSidebarOpen(false);
  };

  const handleDeleteNote = async (id: string) => {
    try {
      if (id.startsWith('draft-')) {
        setNotes(prev => prev.filter(n => n.id !== id));
        setOpenNotes(prev => prev.filter(n => n.id !== id));
        setActiveTab(prev => prev === id ? 'home' : prev);
        return;
      }

      const { error } = await supabase.from('notes').delete().eq('id', id);
      if (error) {
        console.error("Supabase delete failed:", error);
        alert(`Failed to delete note: ${error.message} (Code: ${error.code})`);
        return;
      }

      const nextOpenNotes = openNotes.filter(n => n.id !== id);
      setOpenNotes(nextOpenNotes);
      if (activeTab === id) {
        if (nextOpenNotes.length > 0) {
          setActiveTab(nextOpenNotes[nextOpenNotes.length - 1].id);
        } else {
          setActiveTab('home');
        }
      }
      fetchNotes();
    } catch (err: any) {
      console.error("Exception in note delete:", err);
      alert(`Unexpected error while deleting: ${err.message || err}`);
    }
  };

  const handleCloseTab = (id: string) => {
    const nextOpenNotes = openNotes.filter(n => n.id !== id);
    setOpenNotes(nextOpenNotes);
    if (id.startsWith('draft-')) {
      setNotes(prev => prev.filter(n => n.id !== id));
    }
    if (activeTab === id) {
      if (nextOpenNotes.length > 0) {
        setActiveTab(nextOpenNotes[nextOpenNotes.length - 1].id);
      } else {
        setActiveTab('home');
      }
    }
  };

  const handleNoteUpdated = async (newRealId?: string, oldDraftId?: string) => {
    if (newRealId && oldDraftId) {
      prevActiveTabRef.current = newRealId;
      setActiveTab(newRealId);
      setOpenNotes(prev =>
        prev.map(n => n.id === oldDraftId ? { ...n, id: newRealId } : n)
      );
      setNotes(prev =>
        prev.map(n => n.id === oldDraftId ? { ...n, id: newRealId } : n)
      );
    }
    await fetchNotes();
  };

  const currentActiveNote = activeTab === 'home'
    ? null
    : (openNotes.find(n => n.id === activeTab) || notes.find(n => n.id === activeTab));

  // Filter notes based on activeTagFilter AND searchQuery
  const filteredNotes = notes.filter(note => {
    if (activeTagFilter) {
      const hasTag = note.note_tags?.some((nt: any) => {
        const name = nt.tags?.name;
        if (activeTagFilter === 'system') {
          return name === 'system' || name === 'protocol';
        }
        return name === activeTagFilter;
      });
      if (!hasTag) return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const titleMatch = note.title?.toLowerCase().includes(query);
      const contentMatch = note.content?.toLowerCase().includes(query);
      if (!titleMatch && !contentMatch) return false;
    }
    return true;
  });

  return (
    <div className="app-container">
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        notes={notes}
        onSelectNote={handleSelectNote}
      />

      {/* Mobile top bar */}
      <div className="mobile-header">
        <button className="hamburger-btn" onClick={() => setIsSidebarOpen(true)} aria-label="Open sidebar">
          <Menu size={18} />
        </button>
        <span className="mobile-title">
          {activeTagFilter ? activeTagFilter : 'Inbox'}
        </span>
        <button className="mobile-search-btn" onClick={() => setIsCommandPaletteOpen(true)} aria-label="Search">
          <Search size={16} />
        </button>
      </div>

      {isSidebarOpen && <div className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} />}

      <Sidebar
        notes={notes}
        activeNote={currentActiveNote}
        onSelectNote={handleSelectNote}
        onNewNote={handleNewNote}
        onGoHome={() => setActiveTab('home')}
        onSearchClick={() => setIsCommandPaletteOpen(true)}
        activeTagFilter={activeTagFilter}
        onSelectTagFilter={setActiveTagFilter}
        theme={theme}
        onToggleTheme={toggleTheme}
        isOpen={isSidebarOpen}
        sections={sidebarSections}
        onSaveSections={handleSaveSidebarSections}
      />

      <div className={`center-pane ${currentActiveNote ? 'has-active-note' : ''}`}>
        {/* Middle Column: Chronological Notes Feed */}
        {loading && notes.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-faint)', fontSize: '13px' }}>
            <span>Loading workspace...</span>
          </div>
        ) : (
          <NotesFeed
            notes={filteredNotes}
            activeNote={currentActiveNote}
            onSelectNote={handleSelectNote}
            activeTagFilter={activeTagFilter}
            capsule={capsule}
          />
        )}

        {/* Right Column: Note Editor in Split View */}
        {currentActiveNote ? (
          <div className="split-editor-column">
            {/* Header tab bar inside editor */}
            <div className="editor-tabs-bar" style={{ borderBottom: '1px solid var(--border)', paddingRight: '8px' }}>
              <button
                className="editor-back-btn"
                onClick={() => setActiveTab('home')}
                title="Back to Feed"
              >
                <ArrowLeft size={14} style={{ marginRight: '4px' }} />
                <span>Back</span>
              </button>
              <div style={{ display: 'flex', flex: 1, overflowX: 'auto' }}>
                {openNotes.map(note => (
                  <div
                    key={note.id}
                    className={`editor-tab ${activeTab === note.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(note.id)}
                  >
                    <span className="tab-title">{getDisplayTitle(note)}</span>
                    <button
                      className="tab-close-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloseTab(note.id);
                      }}
                      aria-label="Close tab"
                    >
                      <X aria-hidden="true" size={11} />
                    </button>
                  </div>
                ))}
              </div>
              
              <button
                className="editor-tab"
                style={{ border: 'none', background: 'transparent', padding: '0 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setActiveTab('home')}
                title="Close Editor"
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              <NoteEditor
                key={currentActiveNote.id}
                note={currentActiveNote}
                onNoteUpdated={handleNoteUpdated}
                onDeleteNote={handleDeleteNote}
                capsule={capsule}
                onSaveCapsule={saveCapsule}
              />
            </div>
          </div>
        ) : (
          /* Empty state when no note is open */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-faint)', padding: '32px' }}>
            <span style={{ fontSize: '13px', fontFamily: 'IBM Plex Mono, monospace' }}>No document selected</span>
            <span style={{ fontSize: '11px', marginTop: '6px' }}>Select a note from the feed or press N to compose.</span>
          </div>
        )}
      </div>



      {/* Related Notes panel removed (per screenshot update) */}
    </div>
  );
}

export default App;
