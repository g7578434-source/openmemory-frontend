/* eslint-disable @typescript-eslint/no-explicit-any */
import { motion } from 'framer-motion';
import { Plus, Filter } from 'lucide-react';
import { useState } from 'react';

const getBadgeColor = (tagName: string) => {
  const colors = ['badge-sky', 'badge-purple', 'badge-pink', 'badge-teal', 'badge-orange'];
  return colors[tagName.length % colors.length];
};

const formatTimestamp = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  
  if (date.toDateString() === now.toDateString()) {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes}${ampm}`;
  }
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const stripHtml = (html: string) => {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
};

export function NoteList({ notes, onSelectNote, onNewNote, activeTagFilter, onClearTagFilter }: any) {
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
            <p>No notes found. Create your first memory!</p>
            <button className="btn-primary" onClick={onNewNote} style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={16} /> New Note
            </button>
          </div>
        ) : (
          notes.map((note: any) => (
            <div key={note.id} className="note-list-item" onClick={() => onSelectNote(note)}>
              <div className="note-item-left">
                <span className="note-status-dot" />
              </div>
              <div className="note-item-content">
                <div className="note-item-header">
                  <span className="note-item-title">{note.title || 'Untitled Note'}</span>
                  {note.note_tags && note.note_tags.length > 0 && (
                    <span className="note-item-tags">
                      {note.note_tags.map((nt: any, idx: number) => {
                        if (!nt.tags) return null;
                        return (
                          <span key={idx} className={`badge-pill ${getBadgeColor(nt.tags.name)}`}>
                            #{nt.tags.name}
                          </span>
                        );
                      })}
                    </span>
                  )}
                </div>
                <div className="note-item-preview">
                  {stripHtml(note.content) || 'Empty note…'}
                </div>
              </div>
              <div className="note-item-time-container">
                <span className="note-item-time">{formatTimestamp(note.updated_at)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
