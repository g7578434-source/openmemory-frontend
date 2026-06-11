/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { X, Play, Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

interface SessionStartModalProps {
  isOpen: boolean;
  onClose: () => void;
  capsule: any;
  onSessionStarted: (noteId: string) => void;
  onSaveCapsule: (newState: any) => Promise<void>;
}

export function SessionStartModal({
  isOpen,
  onClose,
  capsule,
  onSessionStarted,
  onSaveCapsule
}: SessionStartModalProps) {
  const [sessionType, setSessionType] = useState<'Research' | 'Validation' | 'Intel' | 'Review'>('Research');
  const [sessionNumber, setSessionNumber] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  // Set default session number based on capsule
  useEffect(() => {
    if (capsule) {
      setSessionNumber((capsule.session_number || 0) + 1);
    }
  }, [capsule, isOpen]);

  if (!isOpen) return null;

  const handleBeginSession = async () => {
    setLoading(true);
    try {
      const todayStr = new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

      // 1. Fetch template note with tag 'template' and title containing 'SESSION IN PROGRESS'
      let templateContent = '';
      
      // Step A: Find the 'template' tag ID
      const { data: tagRow } = await supabase
        .from('tags')
        .select('id')
        .eq('name', 'template')
        .maybeSingle();

      if (tagRow) {
        // Step B: Find note tags linking to this template tag
        const { data: noteTags } = await supabase
          .from('note_tags')
          .select('note_id')
          .eq('tag_id', tagRow.id);

        if (noteTags && noteTags.length > 0) {
          const noteIds = noteTags.map(nt => nt.note_id);
          // Step C: Fetch notes that match the candidate IDs
          const { data: templateNotes } = await supabase
            .from('notes')
            .select('title, content')
            .in('id', noteIds);

          if (templateNotes) {
            // Find the session log template
            const foundTemplate = templateNotes.find(n => 
              n.title.toUpperCase().includes('SESSION IN PROGRESS')
            );
            if (foundTemplate && foundTemplate.content) {
              templateContent = foundTemplate.content;
            }
          }
        }
      }

      // Fallback content if template is not found in database
      if (!templateContent) {
        templateContent = `
# 🔄 Session In Progress — {{date}} (Session #{{session_number}} — {{session_type}})

> ⚡ Claude reads this note at session start, records progress, and updates the Context Capsule.

***

## 🎯 Session Goal
- Conduct {{session_type}} session for the micro-saas-research project.

## 📝 Research & Notes
- 

## 📋 Session Checklist
- [ ] Read Context Capsule at start
- [ ] Log findings and ideas
- [ ] Save mid-session checkpoint
- [ ] Update Context Capsule at session end
        `.trim();
      }

      // 2. Replace variables in template content
      let substitutedContent = templateContent;
      substitutedContent = substitutedContent.split('{{date}}').join(todayStr);
      substitutedContent = substitutedContent.split('{{session_number}}').join(String(sessionNumber));
      substitutedContent = substitutedContent.split('{{session_type}}').join(sessionType);
      substitutedContent = substitutedContent.split('{{idea_name}}').join('');

      // 3. Create the new note
      const title = `🔄 Session In Progress — ${todayStr} (Session #${sessionNumber} — ${sessionType})`;
      const { data: newNote, error: noteErr } = await supabase
        .from('notes')
        .insert({
          title,
          content: substitutedContent,
          status: 'note'
        })
        .select()
        .single();

      if (noteErr) throw noteErr;

      // 4. Attach 'session-log' tag to the note
      let { data: sessionLogTag } = await supabase
        .from('tags')
        .select()
        .eq('name', 'session-log')
        .maybeSingle();

      if (!sessionLogTag) {
        const { data: newTag, error: newTagErr } = await supabase
          .from('tags')
          .insert({ name: 'session-log' })
          .select()
          .single();
        if (newTagErr) throw newTagErr;
        sessionLogTag = newTag;
      }

      await supabase
        .from('note_tags')
        .insert({
          note_id: newNote.id,
          tag_id: sessionLogTag.id
        });

      // 5. Update the capsule with the new session number
      if (capsule) {
        const updatedCapsule = {
          ...capsule,
          session_number: sessionNumber
        };
        await onSaveCapsule(updatedCapsule);
      }

      // 6. Trigger success callback and close modal
      onSessionStarted(newNote.id);
      onClose();
    } catch (err: any) {
      console.error('Error starting session:', err);
      alert(`Error starting session: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="modal-backdrop">
        <motion.div
          className="modal-content glass-panel"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          style={{ maxWidth: '480px' }}
        >
          <div className="modal-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Play size={16} className="session-run-icon" style={{ transform: 'none' }} />
              Start New Session
            </h3>
            <button onClick={onClose} className="btn-close-modal" aria-label="Close modal">
              <X size={16} />
            </button>
          </div>

          <div className="modal-body" style={{ gap: '20px' }}>
            {/* 1. Session Type Picker */}
            <div className="modal-form-group">
              <label className="modal-label">Session Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
                {(['Research', 'Validation', 'Intel', 'Review'] as const).map(type => (
                  <label
                    key={type}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--hairline)',
                      backgroundColor: sessionType === type ? 'var(--primary-selected)' : 'var(--canvas)',
                      borderColor: sessionType === type ? 'var(--primary)' : 'var(--hairline)',
                      cursor: 'pointer',
                      fontSize: '13.5px',
                      fontWeight: sessionType === type ? 600 : 500,
                      color: sessionType === type ? 'var(--primary)' : 'var(--ink-secondary)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <input
                      type="radio"
                      name="sessionType"
                      checked={sessionType === type}
                      onChange={() => setSessionType(type)}
                      style={{
                        accentColor: 'var(--primary)',
                        cursor: 'pointer'
                      }}
                    />
                    {type}
                  </label>
                ))}
              </div>
            </div>

            {/* 2. Session Number */}
            <div className="modal-form-group">
              <label className="modal-label" htmlFor="session-number-input">Session Number</label>
              <input
                id="session-number-input"
                type="number"
                value={sessionNumber}
                onChange={(e) => setSessionNumber(Math.max(1, parseInt(e.target.value) || 1))}
                className="scoring-input"
                style={{
                  textAlign: 'left',
                  marginTop: '6px',
                  backgroundColor: 'var(--canvas)',
                  height: '38px',
                  padding: '0 12px'
                }}
              />
            </div>

            {/* 3. Next Actions */}
            <div className="modal-form-group">
              <label className="modal-label">Next Actions Queue</label>
              <div
                style={{
                  backgroundColor: 'var(--canvas)',
                  border: '1px solid var(--hairline)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  marginTop: '6px',
                  maxHeight: '140px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                {capsule?.next_actions && capsule.next_actions.length > 0 ? (
                  capsule.next_actions.map((action: string, idx: number) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: 'var(--ink-secondary)' }}>
                      <div
                        style={{
                          width: '5px',
                          height: '5px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--primary)',
                          marginTop: '6px',
                          flexShrink: 0
                        }}
                      />
                      <span>{action}</span>
                    </div>
                  ))
                ) : (
                  <span style={{ fontSize: '13px', color: 'var(--ink-faint)', fontStyle: 'italic' }}>
                    No next actions queued.
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button
              onClick={onClose}
              className="btn-utility"
              disabled={loading}
              style={{ padding: '8px 16px', fontSize: '13.5px' }}
            >
              Cancel
            </button>
            <button
              onClick={handleBeginSession}
              className="btn-primary"
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                fontSize: '13.5px',
                backgroundColor: 'var(--primary)',
                color: 'var(--on-primary)',
                borderRadius: 'var(--radius-md)'
              }}
            >
              {loading ? (
                <>
                  <Loader size={14} className="spinner-micro" style={{ animation: 'spin 1s linear infinite' }} />
                  Starting…
                </>
              ) : (
                <>
                  Begin Session →
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
