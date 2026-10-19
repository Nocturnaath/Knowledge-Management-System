import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_URL } from '../config';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('cbijak_token') || null);
  const [loading, setLoading] = useState(true);

  // Dijalankan saat token berubah. Setelah login user sudah terisi, jadi tidak perlu cek /me lagi.
  useEffect(() => {
    const loadUser = async () => {
      if (!token || user) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setUser(data.data);
        } else if (res.status === 401 || res.status === 403) {
          logout(); // token benar-benar tidak valid / kedaluwarsa
        }
      } catch (err) {
        // Server tidak terjangkau: jangan hapus token, cukup tampilkan halaman login
        console.error('Gagal memuat sesi:', err);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const login = (tokenData, userData) => {
    localStorage.setItem('cbijak_token', tokenData);
    setToken(tokenData);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('cbijak_token');
    setToken(null);
    setUser(null);
  };

  const updateUserPhoto = (photoUrl) => {
    if (user) setUser({ ...user, photoUrl });
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUserPhoto, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);