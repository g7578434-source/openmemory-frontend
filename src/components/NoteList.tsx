/* eslint-disable @typescript-eslint/no-explicit-any */
import { motion } from 'framer-motion';
import { Plus, Filter } from 'lucide-react';
import { useState } from 'react';

const getBadgeColor = (tagName: string) => {
  const colors = ['badge-sky', 'badge-purple', 'badge-pink', 'badge-teal', 'badge-orange'];
  return colors[tagName.length % colors.length];
};

const formatRelativeTime = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const stripHtml = (html: string) => {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
};

export function NoteList({ notes, onSelectNote, onNewNote, activeTagFilter, onClearTagFilter, searchQuery }: any) {
  const [activeTab, setActiveTab] = useState('all');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
      className="note-list-container"
    >
      <div className="note-list-header">
        <div className="header-left">
          <h1 className="notes-title">
            {activeTagFilter ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Notes</span>
                <span style={{ fontSize: '18px', color: 'var(--ink-faint)', fontWeight: 300 }}>/</span>
                <span className={`badge-pill ${getBadgeColor(activeTagFilter)}`} style={{ fontSize: '14px', padding: '4px 10px', borderRadius: 'var(--radius-md)', margin: 0 }}>
                  #{activeTagFilter}
                </span>
                <button 
                  onClick={onClearTagFilter}
                  style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 500, cursor: 'pointer', marginLeft: '6px' }}
                >
                  Clear
                </button>
              </span>
            ) : (
              'Notes'
            )}
          </h1>
          <div className="filter-tabs">
            <button 
              className={`filter-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All
            </button>
            <button 
              className={`filter-tab-btn ${activeTab === 'created' ? 'active' : ''}`}
              onClick={() => setActiveTab('created')}
            >
              Created by me
            </button>
            <button 
              className={`filter-tab-btn ${activeTab === 'shared' ? 'active' : ''}`}
              onClick={() => setActiveTab('shared')}
            >
              Shared with me
            </button>
          </div>
        </div>
        <div className="header-right">
          <button className="show-filters-btn">
            <Filter size={14} />
            <span>Show Filters</span>
          </button>
        </div>
      </div>

      <div className="note-items-list">
        {notes.length === 0 ? (
          <div className="notes-empty-state">
            {searchQuery ? (
              <div>
                <p style={{ fontWeight: 600, fontSize: '16px', color: 'var(--ink)', marginBottom: '4px' }}>
                  No results for "{searchQuery}"
                </p>
                <p style={{ fontSize: '13.5px', color: 'var(--ink-muted)' }}>
                  Try a shorter phrase or check your spelling.
                </p>
              </div>
            ) : (
              <>
                <p>No notes found. Create your first memory!</p>
                <button className="btn-primary" onClick={onNewNote} style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <Plus size={16} /> New Note
                </button>
              </>
            )}
          </div>
        ) : (
          notes.map((note: any) => (
            <div 
              key={note.id} 
              className={`note-list-item status-${note.status || 'note'}`} 
              onClick={() => onSelectNote(note)}
            >
              <div className="note-item-left">
                <span className="note-status-dot" />
              </div>
              <div className="note-item-content">
                <div className="note-item-header">
                  <span className="note-item-title">{note.title || 'Untitled Note'}</span>
                </div>
                {note.note_tags && note.note_tags.length > 0 && (
                  <div className="note-item-tags" style={{ marginTop: '2px', marginBottom: '4px' }}>
                    {note.note_tags.slice(0, 2).map((nt: any, idx: number) => {
                      if (!nt.tags) return null;
                      return (
                        <span key={idx} className={`badge-pill ${getBadgeColor(nt.tags.name)}`}>
                          #{nt.tags.name}
                        </span>
                      );
                    })}
                    {note.note_tags.length > 2 && (
                      <span style={{ fontSize: '11px', color: 'var(--ink-faint)', marginLeft: '2px' }}>
                        +{note.note_tags.length - 2} more
                      </span>
                    )}
                  </div>
                )}
                <div className="note-item-preview">
                  {stripHtml(note.content) || 'Empty note…'}
                </div>
              </div>
              <div className="note-item-time-container">
                <span className="note-item-time">{formatRelativeTime(note.updated_at)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
