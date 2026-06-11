/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { Bold, Italic, List, Sparkles, Trash2 } from 'lucide-react';

const getBadgeColor = (tagName: string) => {
  const colors = ['badge-sky', 'badge-purple', 'badge-pink', 'badge-teal', 'badge-orange'];
  return colors[tagName.length % colors.length];
};

export function NoteEditor({ note, onNoteUpdated, onDeleteNote }: any) {
  const [title, setTitle] = useState(note?.title || '');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Initialize Tiptap Editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Press / for commands, or start typing...',
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'editor-link',
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: note?.content || '',
    onUpdate: ({ editor }) => {
      handleSaveContent(editor.getHTML());
    },
  });

  useEffect(() => {
    setTitle(note?.title || '');
    setConfirmDelete(false);
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.15 }}
      className="note-editor-container"
    >
      <div className="note-editor-content-wrapper">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginLeft: 'auto' }}>
            <div className="eyebrow" style={{ color: 'var(--ink-faint)' }} aria-live="polite">
              {saving ? 'Saving…' : 'All changes saved'}
            </div>
            {confirmDelete ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 500 }}>Confirm delete?</span>
                <button 
                  onClick={() => {
                    console.log("Delete confirmed. ID:", note.id);
                    onDeleteNote(note.id);
                    setConfirmDelete(false);
                  }}
                  className="delete-note-btn"
                  style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '4px 8px', fontSize: '12px', borderRadius: '4px' }}
                >
                  Yes, delete
                </button>
                <button 
                  onClick={() => setConfirmDelete(false)}
                  style={{ fontSize: '12px', color: 'var(--ink-muted)', cursor: 'pointer', padding: '4px 8px' }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button 
                onClick={() => {
                  console.log("Delete clicked. Current note object:", note);
                  if (!note || !note.id) {
                    alert("Error: Note ID is missing. Cannot delete.");
                    return;
                  }
                  setConfirmDelete(true);
                }}
                className="delete-note-btn"
                title="Delete Note"
                aria-label="Delete note"
              >
                <Trash2 aria-hidden="true" size={16} />
              </button>
            )}
          </div>
        </div>

        <input 
          type="text" 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleSaveTitle}
          placeholder="Untitled Note"
          className="note-title-input"
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
              aria-label="Bold text"
            >
              <Bold aria-hidden="true" size={16} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`bubble-menu-btn ${editor.isActive('italic') ? 'active' : ''}`}
              aria-label="Italicize text"
            >
              <Italic aria-hidden="true" size={16} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`bubble-menu-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
              aria-label="Bullet list"
            >
              <List aria-hidden="true" size={16} />
            </button>
            <button
              onClick={() => alert("AI Cleanup triggered (Placeholder)")}
              className="bubble-menu-btn"
              style={{ color: 'var(--sticker-purple-text)' }}
              aria-label="Clean up text with AI"
            >
              <Sparkles aria-hidden="true" size={16} style={{ marginRight: '4px' }} /> Clean Up
            </button>
          </BubbleMenu>
        )}

        <EditorContent editor={editor} />
      </div>
    </motion.div>
  );
}
