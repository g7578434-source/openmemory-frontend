/* eslint-disable @typescript-eslint/no-explicit-any */
import { Skull } from 'lucide-react';
import { getDisplayTitle } from '../lib/noteTitleHelper';

interface GraveyardProps {
  notes: any[];
  onSelectNote: (note: any) => void;
}

const parseKillNoteContent = (content: string) => {
  if (!content) return { reason: 'No details logged', niche: 'N/A', session: 'N/A', score: 'N/A' };
  
  const reasonMatch = content.match(/\*\*Reason:\*\*\s*(.*)/i);
  const nicheMatch = content.match(/\*\*Niche:\*\*\s*(.*)/i);
  const sessionMatch = content.match(/\*\*Session:\*\*\s*(.*)/i);
  const scoreMatch = content.match(/\*\*Score:\*\*\s*(.*)/i);
  
  const reason = reasonMatch ? reasonMatch[1].trim() : 'Reason unspecified';
  const niche = nicheMatch ? nicheMatch[1].trim() : 'General';
  const session = sessionMatch ? sessionMatch[1].trim() : '—';
  const score = scoreMatch ? scoreMatch[1].trim() : '—';
  
  return { reason, niche, session, score };
};

export function Graveyard({ notes, onSelectNote }: GraveyardProps) {
  const killedNotes = notes.filter((note: any) => note.status === 'killed');

  return (
    <div className="graveyard-section">
      <div className="graveyard-header">
        <span className="graveyard-title">
          <Skull size={14} style={{ color: 'var(--status-killed)' }} />
          Graveyard: Wall of Fast No's
        </span>
        <span className="graveyard-count">{killedNotes.length} killed</span>
      </div>

      {killedNotes.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--ink-faint)', fontStyle: 'italic', fontSize: '13px' }}>
          No killed ideas yet. A clean pipeline!
        </div>
      ) : (
        <div className="graveyard-grid">
          {killedNotes.map((note: any) => {
            const { reason, niche, session, score } = parseKillNoteContent(note.content);
            const title = getDisplayTitle(note).replace(/^KILL:\s*/i, '');

            return (
              <div
                key={note.id}
                className="tombstone-card"
                onClick={() => onSelectNote(note)}
                title="Click to view details"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <span className="tombstone-title">{title}</span>
                  {score !== '—' && (
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--status-killed)', padding: '1px 4px', borderRadius: '3px' }}>
                      {score} SC
                    </span>
                  )}
                </div>
                
                <p className="tombstone-reason" title={reason}>"{reason}"</p>
                
                <div className="tombstone-meta">
                  <span>niche: {niche}</span>
                  <span>session: #{session}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
