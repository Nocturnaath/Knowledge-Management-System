import React from 'react';
import { useNavigate } from 'react-router-dom'; // untuk pindah halaman tanpa reload
import './Home.css';                             // gaya khusus halaman ini

// Logo kecil di pojok kiri atas
const Logo = () => (
  <img src="/logo-cbijak.png" alt="Logo C-BIJAK" className="logo" />
);

// Ilustrasi besar di sisi kanan (laptop, folder, dokumen, awan)
const Art = () => (
  <svg className="hero-art" viewBox="0 0 420 300" aria-hidden="true">
    <path d="M60 150 C40 80 120 40 190 60 C250 20 360 50 380 120 C410 190 340 260 250 255 C180 285 80 250 60 150 Z" fill="#e6eefb" />
    <rect x="300" y="75" width="92" height="28" rx="14" fill="#5b9cf0" />
    <circle cx="337" cy="72" r="24" fill="#5b9cf0" />
    <circle cx="364" cy="80" r="16" fill="#5b9cf0" />
    <rect x="95" y="165" width="250" height="100" rx="8" fill="#1e4fb8" />
    <rect x="105" y="175" width="230" height="80" rx="4" fill="#dbe8fb" />
    <rect x="195" y="100" width="105" height="120" rx="6" fill="#ffffff" />
    <rect x="210" y="120" width="62" height="7" rx="3" fill="#5b9cf0" />
    <rect x="210" y="138" width="76" height="7" rx="3" fill="#5b9cf0" />
    <rect x="210" y="156" width="50" height="7" rx="3" fill="#5b9cf0" />
    <rect x="150" y="196" width="52" height="16" rx="5" fill="#5b9cf0" />
    <rect x="150" y="206" width="150" height="56" rx="6" fill="#3a78e8" />
    <path d="M70 268 H370 L355 282 H85 Z" fill="#2c5fd0" />
    <circle cx="62" cy="168" r="28" fill="#ffffff" />
    <rect x="52" y="154" width="20" height="28" rx="3" fill="#3a78e8" />
    <rect x="56" y="160" width="12" height="3" fill="#ffffff" />
    <rect x="56" y="167" width="12" height="3" fill="#ffffff" />
    <circle cx="100" cy="98" r="26" fill="#ffffff" />
    <rect x="90" y="85" width="20" height="26" rx="3" fill="#3a78e8" />
    <rect x="94" y="91" width="12" height="3" fill="#ffffff" />
    <rect x="94" y="98" width="12" height="3" fill="#ffffff" />
  </svg>
);

// Tiga ikon kecil untuk bagian fitur di bawah
const IconDokumen = () => (
  <svg viewBox="0 0 32 32" aria-hidden="true">
    <rect x="7" y="4" width="16" height="22" rx="2" fill="#3a78e8" />
    <rect x="10" y="9" width="10" height="2" fill="#ffffff" />
    <rect x="10" y="14" width="10" height="2" fill="#ffffff" />
    <circle cx="23" cy="23" r="6" fill="#22a06b" />
    <rect x="20" y="22" width="6" height="2" fill="#ffffff" />
    <rect x="22" y="20" width="2" height="6" fill="#ffffff" />
  </svg>
);

const IconDivisi = () => (
  <svg viewBox="0 0 32 32" aria-hidden="true">
    <circle cx="16" cy="11" r="5" fill="#3a78e8" />
    <path d="M6 25 C6 18 26 18 26 25 Z" fill="#3a78e8" />
    <circle cx="7" cy="13" r="3.5" fill="#7fb0f2" />
    <circle cx="25" cy="13" r="3.5" fill="#7fb0f2" />
  </svg>
);

const IconInfo = () => (
  <svg viewBox="0 0 32 32" aria-hidden="true">
    <circle cx="16" cy="16" r="12" fill="#3a78e8" />
    <rect x="14.5" y="8" width="3" height="10" rx="1.5" fill="#ffffff" />
    <circle cx="16" cy="22" r="2" fill="#ffffff" />
  </svg>
);

/* ---------- Data fitur ----------
   Ingin menambah/mengubah fitur di bagian bawah? Cukup ubah daftar ini.
   Tiap item = satu kolom: ikon, judul, dan teks singkat. */
const fitur = [
  { icon: <IconDokumen />, judul: 'Kelola Dokumen dengan Mudah', teks: 'Upload, cari, dan kelola dokumen dengan cepat.' },
  { icon: <IconDivisi />, judul: 'Akses Sesuai Divisi', teks: 'Hanya dapat mengakses dokumen dari divisi sendiri.' },
  { icon: <IconInfo />, judul: 'Informasi Umum', teks: 'Dapatkan informasi penting yang dapat diakses oleh semua.' }
];

/* ---------- Halaman Homepage ---------- */
export default function Home() {
  const navigate = useNavigate(); // fungsi untuk berpindah halaman

  return (
    <div className="home">
      {/* 1. Header: logo + nama sistem */}
      <header className="home-header">
        <Logo />
      </header>

      {/* 2. Bagian utama: teks + tombol di kiri, ilustrasi di kanan */}
      <main className="hero">
        <div className="hero-text">
          <h1>Knowledge Management System</h1>
          <p>Kelola dan akses dokumentasi, panduan serta informasi terkini di lingkungan PPK Kemayoran.</p>
          {/* Klik "Masuk" -> pindah ke halaman /login */}
          <button className="btn-masuk" onClick={() => navigate('/login')}>Masuk</button>
        </div>
        <div className="hero-art-wrap">
          <Art />
        </div>
      </main>

      {/* 3. Tiga fitur di bagian bawah (diambil dari daftar "fitur" di atas) */}
      <section className="features">
        {fitur.map((f) => (
          <div className="feat" key={f.judul}>
            <div className="feat-ico">{f.icon}</div>
            <div>
              <h3>{f.judul}</h3>
              <p>{f.teks}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}