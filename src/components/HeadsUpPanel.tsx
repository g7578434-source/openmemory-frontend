/* eslint-disable @typescript-eslint/no-explicit-any */
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';

export function HeadsUpPanel({ notes, activeNote, onSelectNote }: any) {
  // Simple heuristic: just show 3 random/recent notes as "related" for the MVP
  const relatedNotes = notes
    .filter((n: any) => n.id !== activeNote?.id)
    .slice(0, 3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      {relatedNotes.map((note: any, index: number) => (
        <motion.div
          key={note.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1, ease: [0.25, 0.8, 0.25, 1] }}
          style={{
            backgroundColor: 'var(--surface)',
            padding: 'var(--spacing-md)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-sm)',
            cursor: 'pointer',
            border: '1px solid var(--hairline)'
          }}
          whileHover={{ scale: 1.02 }}
          onClick={() => onSelectNote && onSelectNote(note)}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <FileText size={14} color="var(--sticker-purple-text)" style={{ marginRight: '8px' }} />
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
              {note.title || 'Untitled'}
            </h4>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--ink-muted)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
            {note.content ? note.content.replace(/<[^>]*>?/gm, '').substring(0, 80) : 'Empty note'}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
