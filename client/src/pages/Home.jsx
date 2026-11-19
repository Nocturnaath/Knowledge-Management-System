import React from 'react';
import { useNavigate } from 'react-router-dom'; // untuk pindah halaman tanpa reload
import './Home.css';                             // gaya khusus halaman ini
import SiteFooter from '../components/SiteFooter';

// Logo kecil di pojok kiri atas
const Logo = () => (
  <img src="/logo-cbijak.png" alt="Logo C-BIJAK" className="logo" />
);

/* ---------- Data fitur ----------
   Ingin menambah/mengubah fitur di bagian bawah? Cukup ubah daftar ini.
   Tiap item = satu kolom: ikon, judul, dan teks singkat. */
const fitur = [
  { icon: 'dokumen', judul: 'Kelola Dokumen dengan Mudah', teks: 'Upload, cari, dan kelola dokumen dengan cepat.' },
  { icon: 'divisi', judul: 'Akses Sesuai Divisi', teks: 'Hanya dapat mengakses dokumen dari divisi sendiri.' },
  { icon: 'info', judul: 'Informasi Umum', teks: 'Dapatkan informasi penting yang dapat diakses oleh semua.' }
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
          <h1>Selamat Datang di Pusat Pengetahuan PPK Kemayoran</h1>
          <p>Temukan, kelola, dan manfaatkan berbagai dokumentasi, panduan, serta informasi terbaru di lingkungan PPK Kemayoran.</p>
          {/* Klik "Masuk" -> pindah ke halaman /login */}
          <button className="btn-masuk" onClick={() => navigate('/login')}>Masuk</button>
        </div>
        <div className="hero-art-wrap">
          <div className="hero-art" aria-hidden="true" />
        </div>
      </main>

      {/* 3. Tiga fitur di bagian bawah (diambil dari daftar "fitur" di atas) */}
      <section className="features">
        {fitur.map((f) => (
          <div className="feat" key={f.judul}>
            <div className={`feat-ico feat-ico-${f.icon}`} aria-hidden="true" />
            <div>
              <h3>{f.judul}</h3>
              <p>{f.teks}</p>
            </div>
          </div>
        ))}
      </section>
      <SiteFooter />
    </div>
  );
}
