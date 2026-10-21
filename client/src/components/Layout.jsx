
import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Home,
  FileText,
  Users,
  Folder,
  Info,
  Bell,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Daftar menu sidebar.
  const menuUtama = [
    { label: 'Beranda', path: '/dashboard', icon: Home },
    { label: 'Dokumen', path: '/dokumen', icon: FileText },
    { label: 'Dokumen Divisi', path: '/dokumen-divisi', icon: Users },
    { label: 'Aplikasi', path: '/aplikasi', icon: Folder }
  ];

  const menuTambahan = [
    { label: 'Informasi Umum', path: '/informasi', icon: Info },
    { label: 'Notifikasi', path: '/notifikasi', icon: Bell }
  ];

  const nama = user?.nama || user?.nama_lengkap || user?.username || 'Pengguna';
  const divisi = user?.divisi || 'Divisi belum tersedia';

  const handleLogout = () => {
    // Jalankan logout dari AuthContext, lalu arahkan ke login.
    logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      {/* Sidebar di sebelah kiri */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src="/logo-cbijak-putih.png" alt="Logo C-BIJAK" />
        </div>

        {/* Informasi pengguna */}
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {nama.charAt(0).toUpperCase()}
          </div>

          <div className="sidebar-user-info">
            <strong>{nama}</strong>
            <span>{divisi}</span>
          </div>
        </div>

        {/* Menu utama */}
        <nav className="sidebar-nav">
          {menuUtama.map(({ label, path, icon: Icon }) => (
            <NavLink to={path} className="sidebar-link" key={path}>
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}

          <div className="sidebar-divider" />

          {/* Menu informasi tambahan */}
          {menuTambahan.map(({ label, path, icon: Icon }) => (
            <NavLink to={path} className="sidebar-link" key={path}>
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Tombol keluar selalu di bawah sidebar */}
        <button className="sidebar-logout" onClick={handleLogout}>
          <LogOut size={20} />
          <span>Keluar</span>
        </button>
      </aside>

      {/* Halaman aktif, misalnya Profil atau Beranda */}
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}