import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { NoteEditor } from './components/NoteEditor';
import { supabase } from './lib/supabase';

function App() {
  const [notes, setNotes] = useState<any[]>([]);
  const [activeNote, setActiveNote] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchNotes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('notes')
      .select('*')
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

  return (
    <div className="app-container">
      <Sidebar 
        notes={notes} 
        onSelectNote={setActiveNote} 
        onNewNote={handleNewNote}
        activeNoteId={activeNote?.id}
      />
      {loading && notes.length === 0 ? (
        <div className="main-content" style={{ alignItems: 'center', justifyContent: 'center' }}>
          <p className="body-md">Loading...</p>
        </div>
      ) : (
        <NoteEditor 
          note={activeNote} 
          onNoteUpdated={fetchNotes} 
        />
      )}
    </div>
  );
}

export default App;
