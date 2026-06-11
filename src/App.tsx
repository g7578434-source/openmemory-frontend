/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { NoteList } from './components/NoteList';
import { NoteEditor } from './components/NoteEditor';
import { PipelineDashboard } from './components/PipelineDashboard';
import { CapsuleStatusBar } from './components/CapsuleStatusBar';
import { CommandPalette } from './components/CommandPalette';
import { HeadsUpPanel } from './components/HeadsUpPanel';
import { SessionStartModal } from './components/SessionStartModal';
import { supabase } from './lib/supabase';
import { AnimatePresence } from 'framer-motion';
import { Home, X, Search, LayoutGrid } from 'lucide-react';

function App() {
  const [notes, setNotes] = useState<any[]>([]);
  const [openNotes, setOpenNotes] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>('home'); // 'home' or uuid string
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [capsule, setCapsule] = useState<any | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return 'dark'; // Default to premium dark mode
  });

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchNotes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('notes')
      .select('*, note_tags(tags(name))')
      .order('updated_at', { ascending: false });

    if (data) {
      setNotes(data);
      // Sync openNotes with fresh db contents
      setOpenNotes(prev =>
        prev.map(openNote => {
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
  }, []);

  const handleSelectNote = (note: any) => {
    if (!openNotes.some(n => n.id === note.id)) {
      setOpenNotes([...openNotes, note]);
    }
    setActiveTab(note.id);
  };

  const handleNewNote = async () => {
    const { data } = await supabase
      .from('notes')
      .insert({ title: '', content: '' })
      .select()
      .single();

    if (data) {
      setNotes([data, ...notes]);
      setOpenNotes([...openNotes, data]);
      setActiveTab(data.id);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
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
    if (activeTab === id) {
      if (nextOpenNotes.length > 0) {
        setActiveTab(nextOpenNotes[nextOpenNotes.length - 1].id);
      } else {
        setActiveTab('home');
      }
    }
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
      <SessionStartModal
        isOpen={isSessionModalOpen}
        onClose={() => setIsSessionModalOpen(false)}
        capsule={capsule}
        onSessionStarted={async (noteId) => {
          await fetchNotes();
          const { data } = await supabase
            .from('notes')
            .select('*, note_tags(tags(name))')
            .eq('id', noteId)
            .single();
          if (data) {
            setOpenNotes(prev => {
              if (!prev.some(n => n.id === data.id)) {
                return [...prev, data];
              }
              return prev;
            });
            setActiveTab(data.id);
          }
        }}
        onSaveCapsule={saveCapsule}
      />
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
        onStartSessionClick={() => setIsSessionModalOpen(true)}
      />

      <div className="center-pane">
        {/* Context Capsule Status Bar */}
        <CapsuleStatusBar capsule={capsule} />

        {/* Top Search Bar */}
        <div className="top-search-bar-container">
          <div className="top-search-bar">
            <Search aria-hidden="true" size={15} className="top-search-icon" />
            <input
              type="text"
              placeholder="Search notes…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activeTab !== 'home') {
                  setActiveTab('home');
                }
              }}
              className="top-search-input"
            />
            {!searchQuery && (
              <span className="search-shortcut">⌘K</span>
            )}
            {searchQuery && (
              <button className="top-search-clear-btn" onClick={() => setSearchQuery('')} title="Clear search" aria-label="Clear search">
                <X aria-hidden="true" size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="editor-tabs-bar">
          <button
            className={`editor-tab ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => setActiveTab('home')}
          >
            <Home aria-hidden="true" size={13} style={{ marginRight: '6px' }} />
            <span>Home</span>
          </button>

          <button
            className={`editor-tab ${activeTab === 'pipeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('pipeline')}
          >
            <LayoutGrid aria-hidden="true" size={13} style={{ marginRight: '6px' }} />
            <span>Pipeline</span>
          </button>

          {openNotes.map(note => (
            <div
              key={note.id}
              className={`editor-tab ${activeTab === note.id ? 'active' : ''}`}
              onClick={() => setActiveTab(note.id)}
            >
              <span className="tab-title">{note.title || 'Untitled Note'}</span>
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

        <div className="pane-content">
          {loading && notes.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p className="body-md">Loading…</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {activeTab === 'home' ? (
                <NoteList
                  key="list"
                  notes={filteredNotes}
                  onSelectNote={handleSelectNote}
                  onNewNote={handleNewNote}
                  activeTagFilter={activeTagFilter}
                  onClearTagFilter={() => setActiveTagFilter(null)}
                  searchQuery={searchQuery}
                />
              ) : activeTab === 'pipeline' ? (
                <PipelineDashboard
                  key="pipeline"
                  capsule={capsule}
                  onSaveCapsule={saveCapsule}
                />
              ) : (
                <NoteEditor
                  key={currentActiveNote?.id}
                  note={currentActiveNote}
                  onNoteUpdated={fetchNotes}
                  onDeleteNote={handleDeleteNote}
                  capsule={capsule}
                  onSaveCapsule={saveCapsule}
                />
              )}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Related Notes panel removed (per screenshot update) */}
    </div>
  );
}

export default App;
