import { Home, Search, Settings, Plus, Sun, Moon, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

interface SidebarProps {
  notes: any[];
  activeNote: any;
  onSelectNote: (note: any) => void;
  onNewNote: () => void;
  onGoHome: () => void;
  onSearchClick: () => void;
  activeTagFilter: string | null;
  onSelectTagFilter: (tag: string | null) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  activeView: 'home' | 'editor';
}

const NAV_ITEMS = [
  { id: 'home', icon: Home, label: 'All Notes' },
  { id: 'search', icon: Search, label: 'Search  ⌘K' },
];

export function Sidebar({
  notes,
  activeNote,
  onSelectNote,
  onNewNote,
  onGoHome,
  onSearchClick,
  activeTagFilter,
  onSelectTagFilter,
  theme,
  onToggleTheme,
  activeView,
}: SidebarProps) {

  const handleNavClick = (id: string) => {
    if (id === 'home') {
      onSelectTagFilter(null);
      onGoHome();
    } else if (id === 'search') {
      onSearchClick();
    }
  };

  return (
    <aside className="sidebar-rail" role="navigation" aria-label="Main navigation">
      {/* Logo mark */}
      <div className="rail-logo" title="OpenMemory">
        <span className="rail-logo-letter">M</span>
      </div>

      {/* New note */}
      <motion.button
        className="rail-btn"
        onClick={onNewNote}
        whileTap={{ scale: 0.92 }}
        title="New note"
        aria-label="Create new note"
      >
        <Plus size={17} strokeWidth={2.2} />
        <span className="rail-btn-tooltip">New note</span>
      </motion.button>

      <div className="rail-divider" />

      {/* Nav buttons */}
      {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
        <motion.button
          key={id}
          className={`rail-btn ${
            id === 'home' && activeView === 'home' && !activeNote ? 'active' : ''
          }`}
          onClick={() => handleNavClick(id)}
          whileTap={{ scale: 0.92 }}
          aria-label={label}
        >
          <Icon size={17} strokeWidth={1.8} />
          <span className="rail-btn-tooltip">{label}</span>
        </motion.button>
      ))}

      <div className="rail-divider" />

      {/* Recent notes as icon shortcuts */}
      {notes.slice(0, 5).map((note) => (
        <motion.button
          key={note.id}
          className={`rail-btn ${activeNote?.id === note.id ? 'active' : ''}`}
          onClick={() => {
            onSelectTagFilter(null);
            onSelectNote(note);
          }}
          whileTap={{ scale: 0.92 }}
          aria-label={note.title || 'Untitled Note'}
        >
          <FileText size={15} strokeWidth={1.8} />
          <span className="rail-btn-tooltip">{note.title || 'Untitled Note'}</span>
        </motion.button>
      ))}

      <div className="rail-spacer" />

      {/* Theme toggle */}
      <motion.button
        className="rail-btn"
        onClick={onToggleTheme}
        whileTap={{ scale: 0.92 }}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? <Sun size={16} strokeWidth={1.8} /> : <Moon size={16} strokeWidth={1.8} />}
        <span className="rail-btn-tooltip">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
      </motion.button>

      {/* Settings */}
      <motion.button
        className="rail-btn"
        onClick={() => {}}
        whileTap={{ scale: 0.92 }}
        aria-label="Settings"
      >
        <Settings size={16} strokeWidth={1.8} />
        <span className="rail-btn-tooltip">Settings</span>
      </motion.button>
    </aside>
  );
}
