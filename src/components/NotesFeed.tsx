/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from 'react';
import { getDisplayTitle } from '../lib/noteTitleHelper';
import { parseScoresFromContent } from '../lib/parseScore';
import { ArrowRight } from 'lucide-react';

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  launched:  { color: 'var(--accent-emerald)', bg: 'var(--accent-emerald-bg)' },
  validated: { color: 'var(--accent-emerald)', bg: 'var(--accent-emerald-bg)' },
  building:  { color: 'var(--primary-text)', bg: 'var(--primary-hover)' },
  'raw-idea':{ color: 'var(--accent-amber)',   bg: 'var(--accent-amber-bg)' },
  awaiting:  { color: 'var(--accent-cyan)',    bg: 'var(--accent-cyan-bg)' },
  killed:    { color: 'var(--accent-rose)',    bg: 'var(--accent-rose-bg)' },
  parked:    { color: 'var(--ink-muted)',      bg: 'var(--surface-raised)' },
};

const getStatusStyle = (status: string) => {
  return STATUS_COLORS[status] || { color: 'var(--ink-muted)', bg: 'var(--surface-raised)' };
};

interface NotesFeedProps {
  notes: any[];
  activeNote: any;
  onSelectNote: (note: any) => void;
  activeTagFilter: string | null;
  capsule: any;
}

export function NotesFeed({
  notes,
  activeNote,
  onSelectNote,
  activeTagFilter,
  capsule
}: NotesFeedProps) {

  // Sort notes chronologically by updated_at desc
  const sortedNotes = useMemo(() => {
    return [...notes].sort((a: any, b: any) => {
      const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
      const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
      return dateB - dateA;
    });
  }, [notes]);

  const latestAction = capsule?.next_actions?.[0] || 'Idle';
  const sessionNum = capsule?.session_number ?? '—';

  return (
    <div className="notes-feed-column">
      {/* Sleek, text-only capsule banner */}
      <div style={{ padding: '8px 16px', background: 'var(--surface-raised)', borderBottom: '1px solid var(--border)', fontSize: '11px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
        <span>SESS: #{sessionNum}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
          <ArrowRight size={10} style={{ opacity: 0.5 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{latestAction}</span>
        </span>
      </div>

      <div className="feed-header">
        <span className="feed-title">
          {activeTagFilter ? activeTagFilter.replace('-', ' ') : 'Inbox'}
        </span>
      </div>

      <div className="feed-notes-list">
        {sortedNotes.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ink-faint)', fontSize: '13px' }}>
            No notes found in this view.
          </div>
        ) : (
          sortedNotes.map((note) => {
            const scores = parseScoresFromContent(note.content || '');
            const scoreVal = scores.total;
            
            const displayStatus = note.status && note.status !== 'note' && note.status !== 'template' && note.status !== 'protocol' ? note.status : '';

            const tag = note.note_tags?.[0]?.tags?.name || 's' + (note.title?.match(/Session\s*(\d+)/i)?.[1] || '—');

            const isActive = activeNote && activeNote.id === note.id;

            return (
              <div
                key={note.id}
                onClick={() => onSelectNote(note)}
                className={`feed-note-card ${isActive ? 'active' : ''}`}
              >
                <div className="feed-card-header">
                  <span className="feed-card-title">{getDisplayTitle(note)}</span>
                </div>

                <div className="feed-card-meta">
                  {displayStatus && (() => {
                    const sc = getStatusStyle(note.status);
                    return (
                      <span
                        className="feed-pill-status"
                        style={{ color: sc.color, backgroundColor: sc.bg }}
                      >
                        {displayStatus}
                      </span>
                    );
                  })()}
                  {scoreVal > 0 && (
                    <span>sc: {scoreVal}</span>
                  )}
                  <span style={{ color: 'var(--primary-text)', fontWeight: 700 }}>#{tag}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

