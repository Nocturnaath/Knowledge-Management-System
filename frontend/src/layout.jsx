import { useState } from 'react';

const navItems = [
  ['⌂', 'Beranda'],
  ['▤', 'Dokumen'],
  ['♟', 'Dokumen Divisi'],
  ['▰', 'Aplikasi'],
  ['ⓘ', 'Informasi Umum'],
  ['♧', 'Notifikasi'],
];

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 48 42" focusable="false">
          <path d="M7 10h16l4 4h15a3 3 0 0 1 3 3v18a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V13a3 3 0 0 1 3-3Z" fill="#1676ed" />
          <path d="M10 4h18l5 5v17H10a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" fill="#eaf4ff" />
          <path d="M13 10h13M13 14h16M13 18h16" stroke="#70adf7" strokeWidth="2" strokeLinecap="round" />
          <path d="m5 18 6-4 20 17-3 6H7a3 3 0 0 1-3-3V20a2 2 0 0 1 1-2Z" fill="#2789ff" />
          <path d="m12 17 17 14" stroke="#dcecff" strokeWidth="2" />
          <rect x="37" y="5" width="4" height="4" rx="1" fill="#55b8ff" />
          <rect x="42" y="11" width="3" height="3" rx="1" fill="#55b8ff" />
          <rect x="36" y="14" width="3" height="3" rx="1" fill="#55b8ff" />
        </svg>
      </span>
      <span className="brand-copy">
        <b>KMS</b>
        <small>PPK KEMAYORAN</small>
      </span>
    </div>
  );
}

function Sidebar({ activeMenu, menuOpen, onNavigate, onLogout }) {
  return (
    <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
      <Brand />

      <div className="profile">
        <span className="avatar">U</span>
        <span>
          <b>Nama user</b>
          <small>Divisi user</small>
        </span>
      </div>

      <nav aria-label="Navigasi utama">
        {navItems.map(([icon, label], index) => (
          <div key={label}>
            {index === 4 && <div className="nav-divider" />}
            <button
              className={`nav-link ${activeMenu === label ? 'selected' : ''}`}
              onClick={() => onNavigate(label)}
            >
              <span aria-hidden="true">{icon}</span>
              {label}
            </button>
          </div>
        ))}
      </nav>

      <button className="nav-link logout" onClick={onLogout}>
        <span aria-hidden="true">⇥</span>
        Keluar
      </button>
    </aside>
  );
}

export default function DashboardLayout({
  activeMenu,
  onNavigate,
  onLogout,
  pageClassName = '',
  children,
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  function navigateTo(label) {
    onNavigate(label);
    setMenuOpen(false);
  }

  return (
    <div className="dashboard-shell">
      <button
        className="mobile-menu"
        aria-label="Buka navigasi"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        ☰
      </button>

      <Sidebar
        activeMenu={activeMenu}
        menuOpen={menuOpen}
        onNavigate={navigateTo}
        onLogout={onLogout}
      />

      <main className={`main-content ${pageClassName}`}>{children}</main>
    </div>
  );
}

