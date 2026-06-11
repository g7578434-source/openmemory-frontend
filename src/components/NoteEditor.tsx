/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
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
import { Bold, Italic, List, Sparkles, Trash2, X } from 'lucide-react';
import { ScoringForm } from './ScoringForm';

const getBadgeColor = (tagName: string) => {
  const colors = ['badge-sky', 'badge-purple', 'badge-pink', 'badge-teal', 'badge-orange'];
  return colors[tagName.length % colors.length];
};

export function NoteEditor({ note, onNoteUpdated, onDeleteNote, capsule, onSaveCapsule }: any) {
  const [title, setTitle] = useState(note?.title || '');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(note?.updated_at ? new Date(note.updated_at) : null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedText, setLastSavedText] = useState('just now');
  const [pulse, setPulse] = useState(false);

  // Keep & Kill states
  const [showKeepModal, setShowKeepModal] = useState(false);
  const [showKillModal, setShowKillModal] = useState(false);
  const [deadline, setDeadline] = useState('');
  const [killReason, setKillReason] = useState('');
  const [competitorsText, setCompetitorsText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const handleKeepConfirm = async () => {
    if (!note?.id) return;
    setActionLoading(true);
    try {
      let updatedContent = editor ? editor.getHTML() : (note.content || '');
      if (deadline) {
        const deadlineHTML = `<p><strong>Test Deadline:</strong> ${deadline}</p>`;
        const deadlineRegex = /<p[^>]*>(?:<strong[^>]*>)?\s*Test Deadline:\s*(?:<\/strong>)?\s*[\s\S]*?<\/p>/i;
        if (deadlineRegex.test(updatedContent)) {
          updatedContent = updatedContent.replace(deadlineRegex, deadlineHTML);
        } else {
          updatedContent = deadlineHTML + updatedContent;
        }
      }

      const { error: updateErr } = await supabase
        .from('notes')
        .update({
          status: 'awaiting-test',
          content: updatedContent
        })
        .eq('id', note.id);

      if (updateErr) throw updateErr;

      if (capsule && capsule.pipeline) {
        const updatedPipeline = capsule.pipeline.map((p: any) => {
          if (p.tool_name === note.title) {
            return { ...p, status: 'awaiting-test' };
          }
          return p;
        });
        await onSaveCapsule({
          ...capsule,
          pipeline: updatedPipeline
        });
      }

      if (editor) {
        editor.commands.setContent(updatedContent);
      }

      setShowKeepModal(false);
      if (onNoteUpdated) await onNoteUpdated();
    } catch (err: any) {
      alert(`Error keeping note: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleKillConfirm = async () => {
    if (!note?.id) return;
    setActionLoading(true);
    try {
      let niche = 'N/A';
      let score = undefined;
      let matchedItem = null;

      if (capsule && capsule.pipeline) {
        matchedItem = capsule.pipeline.find((p: any) => p.tool_name === note.title);
        if (matchedItem) {
          niche = matchedItem.niche || 'N/A';
          score = matchedItem.score;
        }
      }

      const sessionNum = capsule?.session_number || 1;
      const title = `KILL: ${note.title}`;
      const competitors = competitorsText
        .split(',')
        .map(c => c.trim())
        .filter(Boolean);

      const lines = [
        `## Kill Registry Entry`,
        ``,
        `**Idea:** ${note.title}`,
        `**Niche:** ${niche}`,
        `**Session:** #${sessionNum}`,
        `**Reason:** ${killReason}`,
      ];
      if (score !== undefined) {
        lines.push(`**Score:** ${score}`);
      }
      if (competitors.length > 0) {
        lines.push(``, `**Competitors Found:**`);
        competitors.forEach(c => lines.push(`- ${c}`));
      }
      const killNoteContent = lines.join('\n');

      const { data: killNote, error: killNoteErr } = await supabase
        .from('notes')
        .insert({
          title,
          content: killNoteContent,
          status: 'killed'
        })
        .select()
        .single();

      if (killNoteErr) throw killNoteErr;

      let { data: killedTag } = await supabase
        .from('tags')
        .select()
        .eq('name', 'killed')
        .maybeSingle();

      if (!killedTag) {
        const { data: newTag, error: newTagErr } = await supabase
          .from('tags')
          .insert({ name: 'killed' })
          .select()
          .single();
        if (newTagErr) throw newTagErr;
        killedTag = newTag;
      }

      await supabase
        .from('note_tags')
        .insert({
          note_id: killNote.id,
          tag_id: killedTag.id
        });

      const { error: curNoteErr } = await supabase
        .from('notes')
        .update({ status: 'killed' })
        .eq('id', note.id);

      if (curNoteErr) throw curNoteErr;

      if (capsule && capsule.pipeline) {
        const updatedPipeline = capsule.pipeline.map((p: any) => {
          if (p.tool_name === note.title) {
            return {
              ...p,
              status: 'killed',
              kill_reason: killReason,
              competitors: competitors
            };
          }
          return p;
        });

        const validatedCount = updatedPipeline.filter((p: any) => p.status === 'validated').length;
        const rawCount = updatedPipeline.filter((p: any) => p.status === 'raw-idea').length;

        await onSaveCapsule({
          ...capsule,
          pipeline: updatedPipeline,
          validated_count: validatedCount,
          raw_ideas_count: rawCount
        });
      }

      setShowKillModal(false);
      if (onNoteUpdated) await onNoteUpdated();
    } catch (err: any) {
      alert(`Error killing note: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveScore = async (scores: {
    traffic: number;
    cpc: number;
    repeat: number;
    share: number;
    build: number;
  }) => {
    if (!note?.id) return;
    setSaving(true);
    setSaveError(null);
    try {
      const total = scores.traffic + scores.cpc + scores.repeat + scores.share + scores.build;
      const verdict = total >= 35 ? 'Pass ✅' : 'Fail ❌';
      const scoreString = `<p><strong>Score:</strong> Traffic=${scores.traffic}, CPC=${scores.cpc}, Repeat=${scores.repeat}, Share=${scores.share}, Build=${scores.build}, Total=${total} (${verdict})</p>`;

      const currentHTML = editor ? editor.getHTML() : (note.content || '');
      const scoreRegex = /<p[^>]*>(?:<strong[^>]*>)?\s*Score:\s*(?:<\/strong>)?\s*Traffic=[\s\S]*?<\/p>/i;

      let updatedContent = '';
      if (scoreRegex.test(currentHTML)) {
        updatedContent = currentHTML.replace(scoreRegex, scoreString);
      } else {
        updatedContent = scoreString + currentHTML;
      }

      // 1. Update Supabase
      const { error } = await supabase
        .from('notes')
        .update({ content: updatedContent })
        .eq('id', note.id);
      if (error) throw error;

      setLastSaved(new Date());
      setPulse(true);
      setTimeout(() => setPulse(false), 1000);

      // 2. Update Tiptap Editor
      if (editor) {
        editor.commands.setContent(updatedContent);
      }

      // 3. Notify parent to fetch notes
      if (onNoteUpdated) {
        await onNoteUpdated();
      }
    } catch (err: any) {
      setSaveError(err.message || 'Error saving');
    } finally {
      setSaving(false);
    }
  };

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
    setLastSaved(note?.updated_at ? new Date(note.updated_at) : null);
    setSaveError(null);
  }, [note, editor]);

  useEffect(() => {
    if (!lastSaved) {
      setLastSavedText('');
      return;
    }

    const updateText = () => {
      const diffMs = new Date().getTime() - lastSaved.getTime();
      const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);

      if (diffSecs < 10) {
        setLastSavedText('just now');
      } else if (diffSecs < 60) {
        setLastSavedText(`${diffSecs} seconds ago`);
      } else if (diffMins < 60) {
        setLastSavedText(`${diffMins} min${diffMins > 1 ? 's' : ''} ago`);
      } else if (diffHours < 24) {
        setLastSavedText(`${diffHours} hour${diffHours > 1 ? 's' : ''} ago`);
      } else {
        setLastSavedText(lastSaved.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      }
    };

    updateText();
    const interval = setInterval(updateText, 10000);
    return () => clearInterval(interval);
  }, [lastSaved]);

  // Debounced save for content
  const handleSaveContent = async (htmlContent: string) => {
    if (!note?.id) return;
    setSaving(true);
    setSaveError(null);
    try {
      const { error } = await supabase
        .from('notes')
        .update({ content: htmlContent })
        .eq('id', note.id);
      if (error) throw error;
      setLastSaved(new Date());
      setPulse(true);
      setTimeout(() => setPulse(false), 1000);
    } catch (err: any) {
      setSaveError(err.message || 'Error saving');
    } finally {
      setSaving(false);
    }
  };

  // Immediate save for title
  const handleSaveTitle = async () => {
    if (!note?.id) return;
    setSaving(true);
    setSaveError(null);
    try {
      const { error } = await supabase
        .from('notes')
        .update({ title })
        .eq('id', note.id);
      if (error) throw error;
      setLastSaved(new Date());
      setPulse(true);
      setTimeout(() => setPulse(false), 1000);
      if (onNoteUpdated) onNoteUpdated();
    } catch (err: any) {
      setSaveError(err.message || 'Error saving');
    } finally {
      setSaving(false);
    }
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
            {note?.status === 'raw-idea' && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setShowKeepModal(true)}
                  className="btn-action-promote"
                  style={{ padding: '4px 10px', height: '28px', fontSize: '12.5px', borderRadius: 'var(--radius-sm)' }}
                >
                  Keep ✅
                </button>
                <button 
                  onClick={() => setShowKillModal(true)}
                  className="btn-action-kill"
                  style={{ padding: '4px 10px', height: '28px', fontSize: '12.5px', borderRadius: 'var(--radius-sm)' }}
                >
                  Kill 🪦
                </button>
              </div>
            )}
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

        {/* Scoring Form */}
        {note?.status === 'raw-idea' && (
          <ScoringForm
            noteId={note.id}
            noteContent={note.content || ''}
            onSaveScore={handleSaveScore}
          />
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

        <div className="editor-bottom-bar">
          <div className={`save-indicator ${pulse ? 'pulse' : ''} ${saving ? 'saving' : ''} ${saveError ? 'error' : ''}`}>
            {saving ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span className="spinner-micro" /> Saving…
              </span>
            ) : saveError ? (
              <span className="save-error-text">Save failed — check connection</span>
            ) : lastSaved ? (
              <span>Saved {lastSavedText}</span>
            ) : (
              <span>All changes saved</span>
            )}
          </div>
        </div>
      </div>

      {/* Keep Confirmation Modal */}
      <AnimatePresence>
        {showKeepModal && (
          <div className="modal-backdrop">
            <motion.div 
              className="modal-content glass-panel"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="modal-header">
                <h3>Keep Idea: {note?.title || 'Untitled'}</h3>
                <button onClick={() => setShowKeepModal(false)} className="btn-close-modal">
                  <X size={16} />
                </button>
              </div>
              <div className="modal-body">
                <p className="body-sm text-muted">
                  Promote this idea to "Awaiting Test" and optionally set a validation test deadline.
                </p>
                <div className="modal-form-group">
                  <label className="modal-label" htmlFor="deadline-input">Test Deadline (Optional)</label>
                  <input
                    id="deadline-input"
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="scoring-input"
                    style={{ textAlign: 'left', marginTop: '6px', backgroundColor: 'var(--canvas)', height: '38px', padding: '0 12px' }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  onClick={() => setShowKeepModal(false)} 
                  className="btn-utility"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleKeepConfirm} 
                  className="btn-primary"
                  disabled={actionLoading}
                  style={{ backgroundColor: 'var(--primary)', color: 'var(--on-primary)', borderRadius: 'var(--radius-md)', padding: '6px 16px', fontSize: '13.5px' }}
                >
                  {actionLoading ? 'Saving...' : 'Confirm Keep ✅'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Kill Confirmation Modal */}
      <AnimatePresence>
        {showKillModal && (
          <div className="modal-backdrop">
            <motion.div 
              className="modal-content glass-panel"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="modal-header">
                <h3>Kill Idea: {note?.title || 'Untitled'}</h3>
                <button onClick={() => setShowKillModal(false)} className="btn-close-modal">
                  <X size={16} />
                </button>
              </div>
              <div className="modal-body">
                <p className="body-sm text-muted">
                  Document the kill registry entry. Below 35 score is auto-killed, or if 3+ free competitors exist.
                </p>
                <div className="modal-form-group">
                  <label className="modal-label">Kill Reason</label>
                  <textarea
                    value={killReason}
                    onChange={(e) => setKillReason(e.target.value)}
                    placeholder="e.g. 3+ free tools exist / Market saturated / Score below 35"
                    className="modal-textarea"
                    rows={3}
                  />
                </div>
                <div className="modal-form-group">
                  <label className="modal-label">Competitors Found (Comma-separated)</label>
                  <input
                    type="text"
                    value={competitorsText}
                    onChange={(e) => setCompetitorsText(e.target.value)}
                    placeholder="e.g. https://competitor1.com, competitor2"
                    className="scoring-input"
                    style={{ textAlign: 'left', marginTop: '6px', backgroundColor: 'var(--canvas)', height: '38px', padding: '0 12px' }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  onClick={() => setShowKillModal(false)} 
                  className="btn-utility"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleKillConfirm} 
                  className="btn-danger"
                  disabled={!killReason.trim() || actionLoading}
                >
                  {actionLoading ? 'Logging Kill...' : 'Confirm Kill ❌'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
