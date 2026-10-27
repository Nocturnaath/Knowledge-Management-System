
import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Home,
  FileText,
  Users,
  Folder,
  Info,
  Bell,
  LogOut,
  CheckSquare,
  Tag,
  Lock,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import './Layout.css';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // menyesuaikan menu sama role pengguna yang sedang login.
  const role = user?.role;
  const atasan = role === 'admin' || role === 'super_admin';

  const menuUtama = [
    { label: 'Beranda', path: '/dashboard', icon: Home },
    { label: 'Dokumen', path: '/dokumen', icon: FileText },
    { label: 'Dokumen Divisi', path: '/dokumen-divisi', icon: Users },

    ...(atasan
      ? [
          {
            label: 'Persetujuan Dokumen',
            path: '/persetujuan-dokumen',
            icon: CheckSquare,
          },
        ]
      : []),

    { label: 'Aplikasi', path: '/aplikasi', icon: Folder },
  ];

  const menuTambahan = [
    { label: 'Informasi Umum', path: '/informasi', icon: Info },

    ...(atasan
      ? [
          {
            label: 'Kelola Kategori',
            path: '/kelola-kategori',
            icon: Tag,
          },
        ]
      : []),

    ...(role === 'super_admin'
      ? [
          {
            label: 'Hak Akses',
            path: '/hak-akses',
            icon: Lock,
          },
        ]
      : []),

    { label: 'Notifikasi', path: '/notifikasi', icon: Bell },
  ];

  // Ambil identitas pengguna dari AuthContext.
  const nama =
    user?.nama ||
    user?.nama_lengkap ||
    user?.username ||
    'Pengguna';

  const divisi =
    user?.divisi ||
    user?.nama_divisi ||
    'Divisi belum tersedia';

  // Gunakan foto profil jika tersedia.
  const photoSrc = user?.photoUrl
    ? `${API_URL}${user.photoUrl}`
    : user?.foto_url
      ? `${API_URL}${user.foto_url}`
      : null;

  
  const handleLogout = () => {
    logout();
    navigate('/', {
      replace: true,
      state: { loggedOut: true },
    });
  };

  // Komponen menu agar tampilan menu utama dan tambahan konsisten.
  const renderMenu = (items) =>
    items.map(({ label, path, icon: Icon }) => (
      <NavLink
        to={path}
        key={path}
        end={path === '/dashboard'}
        className={({ isActive }) =>
          `sidebar-link${isActive ? ' active' : ''}`
        }
      >
        <Icon size={19} strokeWidth={1.9} />
        <span>{label}</span>
      </NavLink>
    ));

  return (
    <div className="app-layout">
      {/* Sidebar permanen pakai desain nala. */}
      <aside className="sidebar">
        {/* Logo tetap memakai aset logo C-BIJAK. */}
        <div className="sidebar-logo">
          <img
            src="/logo-cbijak-putih.png"
            alt="Logo C-BIJAK"
          />
        </div>

        {/* Profil pengguna dari akun yang sedang login. */}
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `sidebar-user${isActive ? ' profile-active' : ''}`
          }
          aria-label="Buka profil pengguna"
        >
          <div className="sidebar-avatar">
            {photoSrc ? (
              <img
                src={photoSrc}
                alt={`Foto profil ${nama}`}
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              nama.charAt(0).toUpperCase()
            )}
          </div>

          <div className="sidebar-user-info">
            <strong>{nama}</strong>
            <small>{divisi}</small>
          </div>
        </NavLink>

        {/* Navigasi utama. */}
        <nav className="sidebar-nav" aria-label="Navigasi utama">
          {renderMenu(menuUtama)}

          <div className="sidebar-divider" />

          {/* Navigasi tambahan. */}
          {renderMenu(menuTambahan)}
        </nav>

        {/* Tombol keluar tetap berada di bawah sidebar. */}
        <button
          type="button"
          className="sidebar-logout"
          onClick={handleLogout}
        >
          <LogOut size={19} strokeWidth={1.9} />
          <span>Keluar</span>
        </button>
      </aside>

      {/* Konten halaman dari React Router. */}
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
