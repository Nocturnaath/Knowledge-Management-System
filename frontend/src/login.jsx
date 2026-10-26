import { useState } from 'react';

function Brand() {
  return (
    <div className="brand brand-compact">
      <span className="brand-mark">▱</span>
      <span className="brand-copy">
        <b>KMS</b>
        <small>PPK KEMAYORAN</small>
      </span>
    </div>
  );
}

export default function Login({ onLogin }) {
  const [error, setError] = useState(false);

  function submit(event) {
    event.preventDefault();

    const data = new FormData(event.currentTarget);
    const employee = data.get('employee');
    const password = data.get('password');

    if (employee === 'admin' && password === 'admin123') {
      onLogin();
      return;
    }

    setError(true);
  }

  return (
    <main className="login-screen">
      <div className="login-card">
        <Brand />

        <header className="login-heading">
          <h1>Selamat Datang</h1>
          <p>Masuk untuk melanjutkan ke akun anda</p>
        </header>

        {error && (
          <div className="error-banner" role="alert">
            ID Karyawan atau Kata Sandi Salah
          </div>
        )}

        <form onSubmit={submit}>
          <label className="sr-only" htmlFor="employee">
            ID Karyawan
          </label>
          <input
            id="employee"
            name="employee"
            placeholder="ID Karyawan"
            autoComplete="username"
            required
          />

          <label className="sr-only" htmlFor="password">
            Kata Sandi
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Kata Sandi"
            autoComplete="current-password"
            required
          />

          <div className="forgot">
            <a href="#lupa" onClick={(event) => event.preventDefault()}>
              Lupa Kata Sandi?
            </a>
          </div>

          <button className="primary-button" type="submit">
            Masuk
          </button>
        </form>

        <p className="demo-hint">
          Demo: <b>admin</b> / <b>admin123</b>
        </p>
      </div>
    </main>
  );
}
