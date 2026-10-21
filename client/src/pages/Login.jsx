
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import { API_URL } from '../config';
import './Login.css';

export default function Login() {
  const [ssoId, setSsoId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          { sso_id: ssoId, 
          password: password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        login(data.token, data.user);
      } else {
        setError(data.message || 'Login gagal. Periksa akun Anda.');
      }
    } catch (err) {
      setError('Gagal terhubung ke server backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-wrapper">
      <section className="login-card">
        {/* Logo sudah berisi tulisan C-BIJAK */}
        <div className="login-brand">
          <img
            src="/logo-cbijak.png"
            alt="Logo C-BIJAK"
            className="login-logo"
          />
        </div>

        <header className="login-heading">
          <h1>Selamat Datang</h1>
          <p>Masuk untuk melanjutkan ke akun anda</p>
        </header>

        {error && (
          <div className="login-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="sr-only" htmlFor="username">
              ID Karyawan
            </label>

            <input
              id="username"
              type="text"
              aria-label="ID Karyawan"
              value={ssoId}
              onChange={(e) => setSsoId(e.target.value)}
              placeholder="ID Karyawan"
              autoComplete="username"
              required
            />
          </div>

          <div className="input-group password-group">
            <label className="sr-only" htmlFor="password">
              Kata Sandi
            </label>

            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Kata Sandi"
              autoComplete="current-password"
              required
            />

            <button
              type="button"
              className="eye-btn"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={
                showPassword
                  ? 'Sembunyikan kata sandi'
                  : 'Tampilkan kata sandi'
              }
            >
              {showPassword ? (
                <EyeOff size={20} />
              ) : (
                <Eye size={20} />
              )}
            </button>
          </div>

          <div className="forgot-password">
            <button
              type="button"
              onClick={() =>
                setError('Fitur lupa kata sandi belum tersedia.')
              }
            >
              Lupa Kata Sandi?
            </button>
          </div>

          <button
            type="submit"
            className="btn-login-submit"
            disabled={loading}
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
      </section>
    </main>
  );
}

