
import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation
} from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';

import Home from './pages/Home';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Application from './pages/Aplikasi';
import Notifications from './pages/Notifications';
import DetailAplikasi from './pages/DetailAplikasi';
import Layout from './components/Layout';
import PersetujuanDokumen from './pages/PersetujuanDokumen';
import HakAkses from './pages/HakAkses';

function SidebarPage({ title }) {
  return (
    <main>
      <h1>{title}</h1>
      <p>Halaman {title.toLowerCase()} belum tersedia.</p>
    </main>
  );
}

// Mengatur route berdasarkan status login pengguna.
function AppRoutes() {
  const { user, loading } = useAuth();
  const location = useLocation();
  // Hanya role tertentu yang boleh membuka halaman; selain itu kembali ke profil
const RoleRoute = ({ roles, children }) => {
  const { user } = useAuth();
  return roles.includes(user?.role) ? children : <Navigate to="/profile" replace />;
};

  // Tunggu sampai status sesi login selesai diperiksa.
  if (loading) {
    return (
      <div
        style={{
          display: 'grid',
          placeItems: 'center',
          minHeight: '100vh'
        }}
      >
        Memuat sistem C-BIJAK...
      </div>
    );
  }

  return (
    <Routes>
      {/* Homepage: bisa diakses sebelum login */}
      <Route
        path="/"
        element={
          user && !location.state?.loggedOut
            ? <Navigate to="/profile" replace />
            : <Home />
        }
      />

      {/* Login: pengguna yang sudah login langsung ke profil */}
      <Route
        path="/login"
        element={
          user
            ? <Navigate to="/profile" replace />
            : <Login />
        }
      />

      {/* Halaman setelah login menggunakan Layout dan sidebar */}
      <Route
        element={
          user
            ? <Layout />
            : <Navigate to="/" replace />
        }
      >
        <Route path="/dashboard" element={<SidebarPage title="Beranda" />} />
        <Route path="/dokumen" element={<SidebarPage title="Dokumen" />} />
        <Route path="/dokumen-divisi" element={<SidebarPage title="Dokumen Divisi" />} />
        <Route path="/informasi" element={<SidebarPage title="Informasi Umum" />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/notifikasi" element={<Notifications />} />
        <Route path="/aplikasi" element={<Application />} />
        <Route path="/aplikasi/:id" element={<DetailAplikasi />} />
        <Route path="/persetujuan-dokumen" element={<RoleRoute roles={['admin', 'super_admin']}> <PersetujuanDokumen /> </RoleRoute>}/>
        <Route path="/kelola-kategori" element={<RoleRoute roles={['admin', 'super_admin']}> <SidebarPage title="Kelola Kategori" /> </RoleRoute>}/>
        <Route path="/hak-akses" element={<RoleRoute roles={['super_admin']}> <HakAkses/> </RoleRoute>}/>

      </Route>

      {/* Alamat yang tidak dikenal diarahkan sesuai status login */}
      <Route
        path="*"
        element={
          <Navigate
            to={user ? '/profile' : '/'}
            replace
          />
        }
      />
    </Routes>
  );
}

// Provider autentikasi membungkus seluruh aplikasi.
export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}