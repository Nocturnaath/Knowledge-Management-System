
import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';

import Home from './pages/Home';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Layout from './components/Layout';

// Mengatur route berdasarkan status login pengguna.
function AppRoutes() {
  const { user, loading } = useAuth();

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
          user
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
            : <Navigate to="/login" replace />
        }
      >
        <Route path="/profile" element={<Profile />} />

        {/* Tambahkan halaman lain di sini jika sudah tersedia */}
        {/* <Route path="/dashboard" element={<Dashboard />} /> */}
        {/* <Route path="/dokumen" element={<Dokumen />} /> */}
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