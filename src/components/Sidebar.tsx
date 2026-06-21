/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from 'react';
import { Search, Settings, Plus, Sun, Moon, Inbox, Layers, Edit2, Check, ChevronRight, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';

function formatFolderName(tag: string): string {
  return tag
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

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
  isOpen?: boolean;
  sections: any[];
  onSaveSections: (sections: any[]) => Promise<void>;
}

export function Sidebar({
  notes,
  activeNote,
  onNewNote,
  onGoHome,
  onSearchClick,
  activeTagFilter,
  onSelectTagFilter,
  theme,
  onToggleTheme,
  isOpen,
  sections,
  onSaveSections
}: SidebarProps) {
  const [folders, setFolders] = useState<any[]>([]);
  const [isEditingSidebar, setIsEditingSidebar] = useState(false);
  const [isOtherCollapsed, setIsOtherCollapsed] = useState(true);

  useEffect(() => {
    async function loadFolders() {
      const { data } = await supabase
        .from('tags')
        .select('name, note_tags(count)')
        .order('name');
      if (data) {
        setFolders(data);
      }
    }
    loadFolders();
  }, [notes]);

  const tagMap = useMemo(() => {
    return new Map<string, number>(
      (folders || []).map(f => [f.name, f.note_tags?.[0]?.count ?? 0])
    );
  }, [folders]);

  const otherTags = useMemo(() => {
    const definedTags = new Set((sections || []).flatMap(g => g.tags));
    return (folders || [])
      .map(f => f.name)
      .filter(name => !definedTags.has(name));
  }, [folders, sections]);

  // Sidebar Customization Handlers
  const moveSectionUp = (index: number) => {
    if (index === 0) return;
    const next = [...sections];
    const temp = next[index];
    next[index] = next[index - 1];
    next[index - 1] = temp;
    onSaveSections(next);
  };

  const moveSectionDown = (index: number) => {
    if (index === sections.length - 1) return;
    const next = [...sections];
    const temp = next[index];
    next[index] = next[index + 1];
    next[index + 1] = temp;
    onSaveSections(next);
  };

  const addSection = () => {
    const name = prompt("Enter new section name:");
    if (name && name.trim()) {
      onSaveSections([...sections, { section: name.trim().toUpperCase(), tags: [] }]);
    }
  };

  const renameSection = (index: number, newName: string) => {
    const next = [...sections];
    next[index].section = newName.trim().toUpperCase();
    onSaveSections(next);
  };

  const deleteSection = (index: number) => {
    if (confirm("Are you sure you want to delete this section? Its tags will be moved to the OTHER list.")) {
      onSaveSections(sections.filter((_: any, i: number) => i !== index));
    }
  };

  const moveTagUp = (sectionIndex: number, tagIndex: number) => {
    if (tagIndex === 0) return;
    const next = [...sections];
    const tags = [...next[sectionIndex].tags];
    const temp = tags[tagIndex];
    tags[tagIndex] = tags[tagIndex - 1];
    tags[tagIndex - 1] = temp;
    next[sectionIndex].tags = tags;
    onSaveSections(next);
  };

  const moveTagDown = (sectionIndex: number, tagIndex: number) => {
    const next = [...sections];
    const tags = [...next[sectionIndex].tags];
    if (tagIndex === tags.length - 1) return;
    const temp = tags[tagIndex];
    tags[tagIndex] = tags[tagIndex + 1];
    tags[tagIndex + 1] = temp;
    next[sectionIndex].tags = tags;
    onSaveSections(next);
  };

  const addTagToSection = (sectionIndex: number) => {
    const tagName = prompt("Enter tag name to add (e.g. 'work'):");
    if (tagName && tagName.trim()) {
      const cleaned = tagName.trim().toLowerCase().replace(/\s+/g, '-');
      const next = [...sections];
      if (!next[sectionIndex].tags.includes(cleaned)) {
        next[sectionIndex].tags.push(cleaned);
        onSaveSections(next);
      }
    }
  };

  const removeTagFromSection = (sectionIndex: number, tagIndex: number) => {
    const next = [...sections];
    next[sectionIndex].tags = next[sectionIndex].tags.filter((_: any, i: number) => i !== tagIndex);
    onSaveSections(next);
  };

  const handleMoveTagToSection = (tagName: string, targetSection: string) => {
    let next = sections.map((sec: any) => ({
      ...sec,
      tags: sec.tags.filter((t: string) => t !== tagName)
    }));

    if (targetSection !== 'other') {
      next = next.map((sec: any) => {
        if (sec.section === targetSection) {
          if (!sec.tags.includes(tagName)) {
            return { ...sec, tags: [...sec.tags, tagName] };
          }
        }
        return sec;
      });
    }

    onSaveSections(next);
  };

  return (
    <div className={`sidebar-left ${isOpen ? 'open' : ''}`}>
      {/* Brand logo */}
      <div style={{ padding: '12px 16px 8px 16px' }}>
        <button 
          onClick={() => {
            onSelectTagFilter(null);
            onGoHome();
          }}
          style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.03em', color: 'var(--ink)', background: 'none', border: 'none', cursor: 'pointer', outline: 'none' }}
        >
          OpenMemory
        </button>
      </div>

      {/* Unified actions dock */}
      <div style={{ padding: '0 12px 12px 12px', display: 'flex', gap: '6px' }}>
        <button
          onClick={onNewNote}
          style={{ flex: 1, height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'var(--surface-raised)', border: '1px solid var(--hairline-strong)', borderRadius: 'var(--radius-sm)', fontSize: '12px', fontWeight: 500, color: 'var(--primary)', cursor: 'pointer' }}
        >
          <Plus size={12} />
          <span>New note</span>
        </button>
        <button
          onClick={onSearchClick}
          style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-raised)', border: '1px solid var(--hairline-strong)', borderRadius: 'var(--radius-sm)', color: 'var(--ink-muted)', cursor: 'pointer' }}
          title="Search (⌘K)"
        >
          <Search size={12} />
        </button>
      </div>

      {/* Main Nav Links */}
      <div style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <button
          className={`sidebar-folder-row ${!activeNote && !activeTagFilter ? 'active' : ''}`}
          onClick={() => {
            onSelectTagFilter(null);
            onGoHome();
          }}
        >
          <Inbox size={12} style={{ marginRight: '8px', opacity: 0.7 }} />
          <span>Inbox</span>
          <span className="folder-count">{notes.filter(n => n.status !== 'killed').length}</span>
        </button>
      </div>

      {/* Folders Navigation */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 8px 0 8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px' }}>
          <span className="sidebar-section-header" style={{ padding: 0 }}>Folders</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {isEditingSidebar && (
              <button 
                onClick={addSection}
                style={{ fontSize: '11px', color: 'var(--primary)', cursor: 'pointer', padding: '2px 6px', borderRadius: 'var(--radius-sm)', background: 'var(--folder-count-bg)', fontWeight: 550 }}
              >
                + Group
              </button>
            )}
            <button 
              onClick={() => setIsEditingSidebar(prev => !prev)}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--primary)', cursor: 'pointer', padding: '2px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--folder-count-bg)' }}
              title={isEditingSidebar ? 'Save Changes' : 'Customize Folders'}
            >
              {isEditingSidebar ? <Check size={10} /> : <Edit2 size={10} />}
              <span>{isEditingSidebar ? 'Done' : 'Edit'}</span>
            </button>
          </div>
        </div>

        {isEditingSidebar ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sections.map(({ section, tags }: any, sectionIdx: number) => (
              <div key={sectionIdx} style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px', border: '1px dashed var(--hairline-strong)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--surface-raised)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'space-between' }}>
                  <input 
                    type="text" 
                    value={section} 
                    onChange={(e) => renameSection(sectionIdx, e.target.value)}
                    style={{ fontSize: '10px', fontWeight: 600, width: '100px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', color: 'var(--folder-section-label)', textTransform: 'uppercase', outline: 'none' }}
                  />
                  <div style={{ display: 'flex', gap: '2px' }}>
                    <button onClick={() => moveSectionUp(sectionIdx)} title="Move Section Up" style={{ padding: '2px', cursor: 'pointer', fontSize: '10px' }}>▲</button>
                    <button onClick={() => moveSectionDown(sectionIdx)} title="Move Section Down" style={{ padding: '2px', cursor: 'pointer', fontSize: '10px' }}>▼</button>
                    <button onClick={() => addTagToSection(sectionIdx)} title="Add Folder (Tag)" style={{ padding: '2px', cursor: 'pointer', color: 'var(--primary)', fontSize: '12px', fontWeight: 'bold' }}>+</button>
                    <button onClick={() => deleteSection(sectionIdx)} title="Delete Section" style={{ padding: '2px', cursor: 'pointer', color: 'var(--status-killed)', fontSize: '12px' }}>×</button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '8px' }}>
                  {tags.map((tagName: string, tagIdx: number) => (
                    <div key={tagName} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0', gap: '4px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--ink-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {formatFolderName(tagName)}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <select
                          value={section}
                          onChange={(e) => handleMoveTagToSection(tagName, e.target.value)}
                          style={{ fontSize: '10px', background: 'var(--folder-count-bg)', color: 'var(--ink-secondary)', border: '1px solid var(--border)', borderRadius: '4px', padding: '2px 4px', cursor: 'pointer', outline: 'none', maxWidth: '80px' }}
                        >
                          <option value="other">Unsorted</option>
                          {sections.map((sec: any) => (
                            <option key={sec.section} value={sec.section}>{sec.section}</option>
                          ))}
                        </select>
                        <button onClick={() => moveTagUp(sectionIdx, tagIdx)} title="Move Up" style={{ fontSize: '9px', cursor: 'pointer', padding: '2px' }}>▲</button>
                        <button onClick={() => moveTagDown(sectionIdx, tagIdx)} title="Move Down" style={{ fontSize: '9px', cursor: 'pointer', padding: '2px' }}>▼</button>
                        <button onClick={() => removeTagFromSection(sectionIdx, tagIdx)} title="Remove Folder" style={{ fontSize: '11px', cursor: 'pointer', color: 'var(--status-killed)', padding: '2px' }}>×</button>
                      </div>
                    </div>
                  ))}
                  {tags.length === 0 && (
                    <span style={{ fontSize: '11px', color: 'var(--ink-faint)', fontStyle: 'italic', padding: '2px 0' }}>Empty section</span>
                  )}
                </div>
              </div>
            ))}

            {/* Unsorted tags drawer in Edit Mode */}
            {otherTags.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px', border: '1px dashed var(--hairline-strong)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--surface-raised)', opacity: 0.85 }}>
                <span className="sidebar-section-header" style={{ padding: 0, fontSize: '10px', fontWeight: 600, color: 'var(--folder-section-label)' }}>UNSORTED</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '8px' }}>
                  {otherTags.map((tagName: string) => (
                    <div key={tagName} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0', gap: '4px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--ink-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {formatFolderName(tagName)}
                      </span>
                      <select
                        value="other"
                        onChange={(e) => handleMoveTagToSection(tagName, e.target.value)}
                        style={{ fontSize: '10px', background: 'var(--folder-count-bg)', color: 'var(--ink-secondary)', border: '1px solid var(--border)', borderRadius: '4px', padding: '2px 4px', cursor: 'pointer', outline: 'none', maxWidth: '80px' }}
                      >
                        <option value="other">Unsorted</option>
                        {sections.map((sec: any) => (
                          <option key={sec.section} value={sec.section}>{sec.section}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button 
              onClick={addSection}
              style={{ width: '100%', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)', padding: '6px', fontSize: '11px', textAlign: 'center', color: 'var(--primary)', cursor: 'pointer', marginTop: '4px', fontWeight: 600 }}
            >
              + Add Section
            </button>
          </div>
        ) : (
          <>
            {sections.map(({ section, tags }: any) => {
              return (
                <div key={section} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span className="sidebar-section-header">{section}</span>
                  {tags.map((tagName: string) => {
                    const count = tagMap.get(tagName) ?? 0;
                    const isActive = activeTagFilter === tagName;

                    return (
                      <button
                        key={tagName}
                        onClick={() => {
                          onSelectTagFilter(tagName);
                          onGoHome();
                        }}
                        className={`sidebar-folder-row ${isActive ? 'active' : ''}`}
                      >
                        <Layers size={11} style={{ marginRight: '8px', opacity: 0.5 }} />
                        <span>{formatFolderName(tagName)}</span>
                        {count > 0 && <span className="folder-count">{count}</span>}
                      </button>
                    );
                  })}
                  {tags.length === 0 && (
                    <span style={{ fontSize: '11px', color: 'var(--ink-faint)', fontStyle: 'italic', padding: '4px 16px' }}>Empty group</span>
                  )}
                </div>
              );
            })}
          </>
        )}

        {otherTags.length > 0 && !isEditingSidebar && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div 
              onClick={() => setIsOtherCollapsed(!isOtherCollapsed)}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', userSelect: 'none' }}
              className="sidebar-section-header"
            >
              {isOtherCollapsed ? <ChevronRight size={12} style={{ opacity: 0.5 }} /> : <ChevronDown size={12} style={{ opacity: 0.5 }} />}
              <span style={{ padding: 0 }}>OTHER</span>
            </div>
            
            {!isOtherCollapsed && otherTags.map(tagName => {
              const count = tagMap.get(tagName) ?? 0;
              const isActive = activeTagFilter === tagName;

              return (
                <button
                  key={tagName}
                  onClick={() => {
                    onSelectTagFilter(tagName);
                    onGoHome();
                  }}
                  className={`sidebar-folder-row ${isActive ? 'active' : ''}`}
                >
                  <Layers size={11} style={{ marginRight: '8px', opacity: 0.5 }} />
                  <span>{formatFolderName(tagName)}</span>
                  {count > 0 && <span className="folder-count">{count}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Settings & Theme Toggle */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '12px 12px 0 12px', display: 'flex', gap: '6px', alignItems: 'center' }}>
        <button
          onClick={() => alert("Settings panel coming soon!")}
          style={{ flex: 1, height: '28px', display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', color: 'var(--ink-muted)', paddingLeft: '8px', fontSize: '12px', cursor: 'pointer' }}
        >
          <Settings size={12} />
          <span>Settings</span>
        </button>

        <button
          onClick={onToggleTheme}
          style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: 'var(--ink-muted)', cursor: 'pointer' }}
          title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={12} /> : <Moon size={12} />}
        </button>
      </div>
    </div>
  );
}
