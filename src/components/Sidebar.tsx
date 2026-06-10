import { Home, Search, Settings, Tags } from 'lucide-react';

export function Sidebar({ onGoHome }: any) {
  return (
    <div className="sidebar-left">
      <div style={{ padding: '0 var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
        <h2 className="title" style={{ fontSize: '15px' }}>OpenMemory</h2>
      </div>
      
      <div style={{ padding: '0 var(--spacing-xs)' }}>
        <button className="nav-item active" style={{ width: '100%', textAlign: 'left' }} onClick={onGoHome}>
          <Home size={16} />
          Home
        </button>
        <button className="nav-item" style={{ width: '100%', textAlign: 'left' }}>
          <Search size={16} />
          Search
        </button>
      </div>

      <div style={{ marginTop: 'var(--spacing-lg)' }}>
        <div className="eyebrow" style={{ padding: '0 var(--spacing-md)', marginBottom: 'var(--spacing-xs)', color: 'var(--ink-faint)' }}>
          Collections
        </div>
        <div style={{ padding: '0 var(--spacing-xs)' }}>
          <button className="nav-item" style={{ width: '100%', textAlign: 'left' }}>
            <Tags size={16} />
            All Tags
          </button>
        </div>
      </div>
      
      <div style={{ marginTop: 'auto', padding: '0 var(--spacing-xs)' }}>
        <button className="nav-item" style={{ width: '100%', textAlign: 'left' }} onClick={() => alert("Settings panel coming soon!")}>
          <Settings size={16} />
          Settings
        </button>
      </div>
    </div>
  );
}
