import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { NoteList } from './components/NoteList';
import { NoteEditor } from './components/NoteEditor';
import { CommandPalette } from './components/CommandPalette';
import { HeadsUpPanel } from './components/HeadsUpPanel';
import { supabase } from './lib/supabase';
import { AnimatePresence } from 'framer-motion';

function App() {
  const [notes, setNotes] = useState<any[]>([]);
  const [activeNote, setActiveNote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

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
      if (!activeNote && data.length > 0) {
        setActiveNote(data[0]);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleNewNote = async () => {
    const { data } = await supabase
      .from('notes')
      .insert({ title: '', content: '' })
      .select()
      .single();
    
    if (data) {
      setNotes([data, ...notes]);
      setActiveNote(data);
    }
  };

  const handleDeleteNote = async (id: number) => {
    await supabase.from('notes').delete().eq('id', id);
    setActiveNote(null);
    fetchNotes();
  };

  return (
    <div className="app-container">
      <CommandPalette 
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        notes={notes}
        onSelectNote={setActiveNote}
      />
      <Sidebar onGoHome={() => setActiveNote(null)} />
      
      <div className="center-pane">
        {loading && notes.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p className="body-md">Loading...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {!activeNote ? (
              <NoteList 
                key="list"
                notes={notes} 
                onSelectNote={setActiveNote} 
                onNewNote={handleNewNote} 
              />
            ) : (
              <NoteEditor 
                key="editor"
                note={activeNote} 
                onNoteUpdated={fetchNotes} 
                onDeleteNote={handleDeleteNote}
              />
            )}
          </AnimatePresence>
        )}
      </div>

      <div className="sidebar-right">
        <h3 className="title" style={{ fontSize: '15px', marginBottom: '16px' }}>Heads Up</h3>
        <HeadsUpPanel notes={notes} activeNote={activeNote} />
      </div>
    </div>
  );
}

export default App;
