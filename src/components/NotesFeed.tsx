/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from 'react';
import { getDisplayTitle } from '../lib/noteTitleHelper';
import { parseScoresFromContent } from '../lib/parseScore';
import { ArrowRight } from 'lucide-react';

interface NotesFeedProps {
  notes: any[];
  activeNote: any;
  onSelectNote: (note: any) => void;
  activeTagFilter: string | null;
  capsule: any;
}

const stripHtml = (html: string) => {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
};

const getFirstTextLine = (content: string) => {
  const text = stripHtml(content);
  const firstLine = text.split('\n').map(line => line.trim()).filter(line => line.length > 0 && !line.startsWith('#'))[0];
  return firstLine || 'No preview...';
};

// Date helper to classify notes
const classifyDateGroup = (dateStr: string) => {
  if (!dateStr) return 'Older';
  const noteDate = new Date(dateStr);
  const today = new Date();
  
  const diffTime = Math.abs(today.getTime() - noteDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 1) return 'Today';
  if (diffDays <= 2) return 'Yesterday';
  if (diffDays <= 7) return 'Last Week';
  return 'Older';
};

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

  // Group notes by date classification
  const groupedNotes = useMemo(() => {
    const groups: Record<string, any[]> = {
      'Today': [],
      'Yesterday': [],
      'Last Week': [],
      'Older': []
    };

    sortedNotes.forEach((note) => {
      const group = classifyDateGroup(note.updated_at || note.created_at);
      if (groups[group]) {
        groups[group].push(note);
      } else {
        groups['Older'].push(note);
      }
    });

    return groups;
  }, [sortedNotes]);

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
          (['Today', 'Yesterday', 'Last Week', 'Older'] as const).map((groupName) => {
            const groupNotes = groupedNotes[groupName] || [];
            if (groupNotes.length === 0) return null;

            return (
              <div key={groupName}>
                <div className="feed-date-group-header">{groupName}</div>
                {groupNotes.map((note) => {
                  const scores = parseScoresFromContent(note.content || '');
                  const scoreVal = scores.total;
                  
                  const isKilled = note.status === 'killed';
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
                      
                      <p className="feed-card-preview">{getFirstTextLine(note.content)}</p>

                      <div className="feed-card-meta">
                        {displayStatus && (
                          <span className="feed-pill-status" style={{ color: isKilled ? 'var(--status-killed)' : 'var(--primary)' }}>
                            {displayStatus}
                          </span>
                        )}
                        {scoreVal > 0 && (
                          <span>sc: {scoreVal}</span>
                        )}
                        <span>#{tag}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
