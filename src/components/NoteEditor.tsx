import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, List, Sparkles, Trash2 } from 'lucide-react';

const getBadgeColor = (tagName: string) => {
  const colors = ['badge-sky', 'badge-purple', 'badge-pink', 'badge-teal', 'badge-orange'];
  return colors[tagName.length % colors.length];
};

export function NoteEditor({ note, onNoteUpdated, onDeleteNote }: any) {
  const [title, setTitle] = useState(note?.title || '');
  const [saving, setSaving] = useState(false);

  // Initialize Tiptap Editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Press / for commands, or start typing...',
      }),
    ],
    content: note?.content || '',
    onUpdate: ({ editor }) => {
      handleSaveContent(editor.getHTML());
    },
  });

  useEffect(() => {
    setTitle(note?.title || '');
    if (editor && note?.content !== editor.getHTML()) {
      editor.commands.setContent(note?.content || '');
    }
  }, [note, editor]);

  // Debounced save for content
  const handleSaveContent = async (htmlContent: string) => {
    if (!note?.id) return;
    setSaving(true);
    await supabase
      .from('notes')
      .update({ content: htmlContent })
      .eq('id', note.id);
    setSaving(false);
  };

  // Immediate save for title
  const handleSaveTitle = async () => {
    if (!note?.id) return;
    setSaving(true);
    await supabase
      .from('notes')
      .update({ title })
      .eq('id', note.id);
    setSaving(false);
    if (onNoteUpdated) onNoteUpdated();
  };

  return (
    <motion.div 
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      style={{ padding: '40px 10%', maxWidth: '900px', margin: '0 auto', width: '100%', height: '100%', backgroundColor: 'var(--surface)', position: 'absolute', top: 0, left: 0, overflowY: 'auto' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginLeft: 'auto' }}>
          <div className="eyebrow" style={{ color: 'var(--ink-faint)' }}>
            {saving ? 'Saving...' : 'All changes saved'}
          </div>
          <button 
            onClick={() => {
              if (window.confirm("Are you sure you want to delete this note?")) {
                onDeleteNote(note.id);
              }
            }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', display: 'flex', alignItems: 'center' }}
            title="Delete Note"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <input 
        type="text" 
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleSaveTitle}
        placeholder="Untitled Note"
        style={{
          width: '100%',
          fontSize: '3em',
          fontWeight: 700,
          border: 'none',
          outline: 'none',
          backgroundColor: 'transparent',
          marginBottom: 'var(--spacing-lg)',
          color: 'var(--ink)',
          lineHeight: 1.1
        }}
      />
      
      {/* Tag Display */}
      {note.note_tags && note.note_tags.length > 0 && (
        <div style={{ marginBottom: 'var(--spacing-md)' }}>
          {note.note_tags.map((nt: any, idx: number) => {
            if (!nt.tags) return null;
            return (
              <span key={idx} className={`badge-pill ${getBadgeColor(nt.tags.name)}`}>
                #{nt.tags.name}
              </span>
            );
          })}
        </div>
      )}

      {editor && (
        <BubbleMenu editor={editor} className="bubble-menu-container">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`bubble-menu-btn ${editor.isActive('bold') ? 'active' : ''}`}
          >
            <Bold size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`bubble-menu-btn ${editor.isActive('italic') ? 'active' : ''}`}
          >
            <Italic size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`bubble-menu-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
          >
            <List size={16} />
          </button>
          <button
            onClick={() => alert("AI Cleanup triggered (Placeholder)")}
            className="bubble-menu-btn"
            style={{ color: 'var(--sticker-purple-text)' }}
          >
            <Sparkles size={16} style={{ marginRight: '4px' }} /> Clean Up
          </button>
        </BubbleMenu>
      )}

      <EditorContent editor={editor} />

    </motion.div>
  );
}
