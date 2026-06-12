/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef } from 'react';
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
import { marked } from 'marked';
import { ScoringForm } from './ScoringForm';

marked.use({ gfm: true, breaks: false })

function isHtmlContent(content: string): boolean {
  return /^\s*<(p|div|h[1-6]|ul|ol|table|blockquote|pre|hr|input)/i.test(content)
}

function markdownToTiptapHtml(md: string): string {
  if (!md) return ''
  if (isHtmlContent(md)) return md
  const html = marked.parse(md, { async: false }) as string
  return html.replace(
    /<ul>([\s\S]*?)<\/ul>/gi,
    (fullMatch: string, innerContent: string) => {
      if (!/type="checkbox"/i.test(innerContent)) return fullMatch
      const convertedItems = innerContent.replace(
        /<li>([\s\S]*?)<\/li>/gi,
        (_: string, itemContent: string) => {
          const isChecked = /checked/i.test(itemContent)
          const textContent = itemContent.replace(/<input[^>]*>/gi, '').trim()
          return `<li data-type="taskItem" data-checked="${isChecked}"><p>${textContent}</p></li>`
        }
      )
      return `<ul data-type="taskList">\n${convertedItems}\n</ul>`
    }
  )
}

const getBadgeColor = (tagName: string) => {
  const colors = ['badge-sky', 'badge-purple', 'badge-pink', 'badge-teal', 'badge-orange'];
  return colors[tagName.length % colors.length];
};

export function NoteEditor({ note, onNoteUpdated, onDeleteNote, capsule, onSaveCapsule }: any) {
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

  // Tag Autocomplete Popover States
  const [tagQuery, setTagQuery] = useState<string | null>(null);
  const [tagPopupCoords, setTagPopupCoords] = useState<{ top: number; left: number } | null>(null);
  const [allTags, setAllTags] = useState<any[]>([]);
  const [selectedTagIndex, setSelectedTagIndex] = useState(0);

  const fetchAllTags = async () => {
    const { data } = await supabase.from('tags').select('id, name').order('name');
    if (data) {
      setAllTags(data);
    }
  };

  useEffect(() => {
    fetchAllTags();
  }, []);

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

  const extractTitleFromEditor = (edt: any) => {
    const json = edt.getJSON();
    if (!json || !json.content) return 'Untitled';

    // Find the first heading of level 1
    for (const node of json.content) {
      if (node.type === 'heading' && node.attrs?.level === 1) {
        return node.content?.[0]?.text || 'Untitled';
      }
    }

    // Fallback: use first block text
    const firstNode = json.content[0];
    if (firstNode && firstNode.content?.[0]?.text) {
      return firstNode.content[0].text;
    }
    return 'Untitled';
  };

  const saveTimer = useRef<any>(null);

  // Debounced save for content and title
  const handleSave = async (htmlContent: string, extractedTitle: string) => {
    if (!note?.id) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (note.id.startsWith('draft-')) {
        // Create new note
        const { data, error } = await supabase
          .from('notes')
          .insert({
            title: extractedTitle,
            content: htmlContent,
            status: 'note'
          })
          .select()
          .single();
        if (error) throw error;

        setLastSaved(new Date());
        setPulse(true);
        setTimeout(() => setPulse(false), 1000);

        if (onNoteUpdated) {
          await onNoteUpdated(data.id, note.id);
        }
      } else {
        // Update existing note
        const { error } = await supabase
          .from('notes')
          .update({
            title: extractedTitle,
            content: htmlContent
          })
          .eq('id', note.id);
        if (error) throw error;

        setLastSaved(new Date());
        setPulse(true);
        setTimeout(() => setPulse(false), 1000);

        if (onNoteUpdated) {
          await onNoteUpdated();
        }
      }
    } catch (err: any) {
      setSaveError(err.message || 'Error saving');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = async (tagName: string) => {
    if (!note?.id) return;
    try {
      let { data: tag } = await supabase
        .from('tags')
        .select('id, name')
        .eq('name', tagName)
        .maybeSingle();

      if (!tag) {
        const { data: newTag, error: tagErr } = await supabase
          .from('tags')
          .insert({ name: tagName })
          .select()
          .single();
        if (tagErr) throw tagErr;
        tag = newTag;
      }

      if (!tag) {
        throw new Error('Failed to retrieve or create tag');
      }

      // Check if junction already exists
      const alreadyHas = note.note_tags?.some((nt: any) => nt.tags?.id === tag.id);
      if (!alreadyHas) {
        const { error } = await supabase
          .from('note_tags')
          .insert({ note_id: note.id, tag_id: tag.id });
        if (error) throw error;
      }

      await fetchAllTags();
      if (onNoteUpdated) await onNoteUpdated();
    } catch (err: any) {
      alert(`Error adding tag: ${err.message}`);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!note?.id) return;
    try {
      const { error } = await supabase
        .from('note_tags')
        .delete()
        .eq('note_id', note.id)
        .eq('tag_id', tagId);
      if (error) throw error;
      if (onNoteUpdated) await onNoteUpdated();
    } catch (err: any) {
      alert(`Error removing tag: ${err.message}`);
    }
  };

  const checkTagTrigger = (edt: any) => {
    const { view, state } = edt;
    const { $from } = state.selection;
    const textBefore = $from.parent.textBetween(Math.max(0, $from.parentOffset - 20), $from.parentOffset, null, '\n');
    const hashMatch = textBefore.match(/#(\w*)$/);

    if (hashMatch) {
      const query = hashMatch[1];
      setTagQuery(query);

      try {
        const coords = view.coordsAtPos($from.pos);
        setTagPopupCoords({
          top: coords.bottom + window.scrollY,
          left: coords.left + window.scrollX
        });
      } catch (err) {
        setTagPopupCoords({ top: 100, left: 100 });
      }
      setSelectedTagIndex(0);
    } else {
      setTagQuery(null);
      setTagPopupCoords(null);
    }
  };

  const handleSelectTag = async (tagName: string) => {
    if (!editor) return;

    const { state } = editor;
    const { $from } = state.selection;
    const textBefore = $from.parent.textBetween(Math.max(0, $from.parentOffset - 20), $from.parentOffset, null, '\n');
    const hashMatch = textBefore.match(/#(\w*)$/);

    if (hashMatch) {
      const from = $from.pos - hashMatch[0].length;
      const to = $from.pos;
      editor.chain().focus().deleteRange({ from, to }).run();
    }

    await handleAddTag(tagName);
    setTagQuery(null);
    setTagPopupCoords(null);
  };

  const filteredTags = allTags.filter(t => t.name.toLowerCase().includes((tagQuery || '').toLowerCase()));

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
    content: markdownToTiptapHtml(note?.content || ''),
    onUpdate: ({ editor }) => {
      clearTimeout(saveTimer.current);
      setSaving(true);
      setSaveError(null);

      const currentHTML = editor.getHTML();
      const extractedTitle = extractTitleFromEditor(editor);

      saveTimer.current = setTimeout(() => {
        handleSave(currentHTML, extractedTitle);
      }, 1500);

      checkTagTrigger(editor);
    },
    onSelectionUpdate: ({ editor }) => {
      checkTagTrigger(editor);
    },
    editorProps: {
      handleKeyDown: (_view, event) => {
        if (tagQuery !== null) {
          const tagsList = [...filteredTags];
          if (tagQuery && !tagsList.some(t => t.name.toLowerCase() === tagQuery.toLowerCase())) {
            tagsList.push({ id: 'new', name: tagQuery });
          }

          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setSelectedTagIndex(prev => Math.min(tagsList.length - 1, prev + 1));
            return true;
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            setSelectedTagIndex(prev => Math.max(0, prev - 1));
            return true;
          }
          if (event.key === 'Enter') {
            event.preventDefault();
            const selected = tagsList[selectedTagIndex];
            if (selected) {
              handleSelectTag(selected.name);
            }
            return true;
          }
          if (event.key === 'Escape') {
            setTagQuery(null);
            setTagPopupCoords(null);
            return true;
          }
        }

        // Ctrl+S / Cmd+S force save
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
          event.preventDefault();
          clearTimeout(saveTimer.current);
          const currentHTML = editor?.getHTML();
          if (currentHTML && editor) {
            const extractedTitle = extractTitleFromEditor(editor);
            handleSave(currentHTML, extractedTitle);
          }
          return true;
        }

        return false;
      }
    }
  });

  useEffect(() => {
    // Synchronously flush any active saves before switching note
    if (saveTimer.current && editor) {
      clearTimeout(saveTimer.current);
      const currentHTML = editor.getHTML();
      const extractedTitle = extractTitleFromEditor(editor);
      handleSave(currentHTML, extractedTitle);
    }

    setConfirmDelete(false);
    if (editor && note?.content !== editor.getHTML()) {
      const html = markdownToTiptapHtml(note?.content || '');
      editor.commands.setContent(html);
    }
    setLastSaved(note?.updated_at ? new Date(note.updated_at) : null);
    setSaveError(null);
  }, [note, editor]);

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

        {/* Tag Display (Removable Pills) */}
        {note.note_tags && note.note_tags.length > 0 && (
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            {note.note_tags.map((nt: any, idx: number) => {
              if (!nt.tags) return null;
              return (
                <span key={idx} className={`badge-pill ${getBadgeColor(nt.tags.name)}`}>
                  #{nt.tags.name}
                  <button
                    onClick={() => handleRemoveTag(nt.tags.id)}
                    className="tag-chip-remove"
                    aria-label={`Remove tag ${nt.tags.name}`}
                  >
                    ×
                  </button>
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
              <span className="save-indicator-text save-indicator-saving">
                <span className="skeleton skeleton-saving" />
                Saving…
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

      {tagQuery !== null && tagPopupCoords && (
        <div
          className="tag-autocomplete-popup"
          style={{
            position: 'absolute',
            top: `${tagPopupCoords.top}px`,
            left: `${tagPopupCoords.left}px`,
          }}
        >
          {filteredTags.map((t, idx) => (
            <button
              key={t.id}
              className={`tag-autocomplete-item ${idx === selectedTagIndex ? 'active' : ''}`}
              onClick={() => handleSelectTag(t.name)}
            >
              #{t.name}
            </button>
          ))}
          {tagQuery && !filteredTags.some(t => t.name.toLowerCase() === tagQuery.toLowerCase()) && (
            <button
              className={`tag-autocomplete-item ${filteredTags.length === selectedTagIndex ? 'active' : ''}`}
              onClick={() => handleSelectTag(tagQuery)}
              style={{ fontStyle: 'italic', borderTop: '1px solid var(--hairline)' }}
            >
              + Create tag "{tagQuery}"
            </button>
          )}
          {filteredTags.length === 0 && !tagQuery && (
            <div style={{ padding: '6px 10px', fontSize: '12px', color: 'var(--ink-faint)' }}>
              Type to search tags...
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
