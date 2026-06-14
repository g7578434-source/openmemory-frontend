import { useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, List, Trash2, CheckSquare, Hash, Sparkles, Pilcrow } from 'lucide-react';
import { getTagColor } from './NoteList';

interface NoteEditorProps {
  note: any;
  onNoteUpdated: () => void;
  onDeleteNote: (id: string) => void;
}

export function NoteEditor({ note, onNoteUpdated, onDeleteNote }: NoteEditorProps) {
  const [title, setTitle] = useState(note?.title || '');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start writing, or press / for commands...',
      }),
    ],
    content: note?.content || '',
    onUpdate: ({ editor }) => {
      debouncedSaveContent(editor.getHTML());
    },
  });

  // Sync state when note changes
  useEffect(() => {
    setTitle(note?.title || '');
    setConfirmDelete(false);
    if (editor && note?.content !== editor.getHTML()) {
      editor.commands.setContent(note?.content || '', false);
    }
  }, [note?.id]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = titleRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  }, [title]);

  const debouncedSaveContent = (html: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (!note?.id || !isSupabaseConfigured) return;
      setSaving(true);
      await supabase.from('notes').update({ content: html }).eq('id', note.id);
      setSaving(false);
    }, 600);
  };

  const handleSaveTitle = async () => {
    if (!note?.id || !isSupabaseConfigured) return;
    setSaving(true);
    await supabase.from('notes').update({ title }).eq('id', note.id);
    setSaving(false);
    onNoteUpdated();
  };

  const tags: string[] = note?.note_tags
    ?.filter((nt: any) => nt.tags?.name)
    .map((nt: any) => nt.tags.name) || [];

  const paneVariants = {
    hidden: { opacity: 0, x: 16 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } },
    exit:   { opacity: 0, x: -12, transition: { duration: 0.18 } },
  };

  return (
    <motion.div
      className="editor-pane"
      variants={paneVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Toolbar */}
      <div className="editor-toolbar">
        <div className="editor-toolbar-left" />

        <div className="editor-toolbar-right">
          <span className="toolbar-save-status">
            {saving ? 'Saving…' : 'Saved'}
          </span>

          <AnimatePresence mode="wait">
            {confirmDelete ? (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.12 }}
                className="confirm-delete-row"
              >
                <span className="confirm-delete-label">Delete this note?</span>
                <button
                  className="btn-danger"
                  onClick={() => { onDeleteNote(note.id); setConfirmDelete(false); }}
                >
                  Delete
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="trash"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="toolbar-btn danger"
                onClick={() => setConfirmDelete(true)}
                title="Delete note"
                aria-label="Delete note"
              >
                <Trash2 size={14} />
                Delete
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Editor scroll area */}
      <div className="editor-scroll">
        <div className="editor-content-area">
          {/* Title */}
          <textarea
            ref={titleRef}
            className="editor-title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSaveTitle}
            placeholder="Untitled"
            rows={1}
            aria-label="Note title"
          />

          {/* Tags */}
          {tags.length > 0 && (
            <div className="editor-tags-row">
              {tags.map((tag) => (
                <span key={tag} className={`note-tag-pill ${getTagColor(tag)}`}>
                  <Hash size={10} style={{ display: 'inline', marginRight: '3px' }} />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Bubble Menu */}
          {editor && (
            <BubbleMenu editor={editor} className="bubble-menu-container">
              <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`bubble-menu-btn ${editor.isActive('bold') ? 'active' : ''}`}
                title="Bold"
              >
                <Bold size={14} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`bubble-menu-btn ${editor.isActive('italic') ? 'active' : ''}`}
                title="Italic"
              >
                <Italic size={14} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`bubble-menu-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
                title="Bullet list"
              >
                <List size={14} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`bubble-menu-btn ${editor.isActive('orderedList') ? 'active' : ''}`}
                title="Ordered list"
              >
                <Pilcrow size={14} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={`bubble-menu-btn ${editor.isActive('blockquote') ? 'active' : ''}`}
                title="Block quote"
              >
                <CheckSquare size={14} />
              </button>
              <div style={{ width: '1px', background: 'var(--border)', margin: '4px 2px' }} />
              <button
                className="bubble-menu-btn"
                style={{ color: 'var(--accent)', gap: '4px', fontSize: '12px' }}
                onClick={() => {}}
                title="AI cleanup"
              >
                <Sparkles size={13} />
                Clean up
              </button>
            </BubbleMenu>
          )}

          <EditorContent editor={editor} />
        </div>
      </div>
    </motion.div>
  );
}
