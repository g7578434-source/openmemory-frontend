import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function NoteEditor({ note, onNoteUpdated }: any) {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(note?.title || '');
    setContent(note?.content || '');
  }, [note]);

  const handleSave = async () => {
    if (!note) return;
    setSaving(true);
    const { error } = await supabase
      .from('notes')
      .update({ title, content, updated_at: new Date() })
      .eq('id', note.id);
    
    setSaving(false);
    if (!error && onNoteUpdated) onNoteUpdated();
  };

  if (!note) {
    return (
      <div className="main-content" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--ink-faint)' }}>
          <p className="body-md">Select a note or create a new one</p>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content" style={{ padding: '40px 10%', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
        <div className="eyebrow" style={{ color: 'var(--ink-faint)' }}>
          {saving ? 'Saving...' : 'All changes saved'}
        </div>
        <button className="btn-utility" onClick={handleSave}>Force Save</button>
      </div>

      <input 
        type="text" 
        className="heading-1" 
        style={{ 
          border: 'none', 
          outline: 'none', 
          width: '100%', 
          marginBottom: 'var(--spacing-md)',
          color: 'var(--ink)'
        }} 
        placeholder="Untitled"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleSave}
      />
      
      <textarea 
        className="textarea-field"
        placeholder="Start typing..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={handleSave}
      />
    </div>
  );
}
