
import React from 'react';
import { useAuth } from '../context/AuthContext';
import './Beranda.css';

// Label statistik akan tetap tampil.
// Angka akan diisi setelah terhubung ke backend.
const documentStats = [
  'Total Dokumen',
  'Dokumen Saya',
  'Menunggu Persetujuan',
];

function PageHeader() {
  const { user } = useAuth();

  // Ambil nama dari akun yang sedang login.
  const nama = user?.nama || user?.nama_lengkap || 'Pengguna';

  // Tampilkan tanggal saat ini secara otomatis.
  const tanggal = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <header className="beranda-header">
      <div>
        <h1>
          Selamat Datang, <em>{nama}</em>
        </h1>
        <p>
          Kelola dan temukan pengetahuan di lingkungan PPK Kemayoran
        </p>
      </div>

      <time>{tanggal}</time>
    </header>
  );
}

function DocumentStats() {
  return (
    <section
      className="beranda-stats"
      aria-label="Ringkasan dokumen"
    >
      {documentStats.map((label) => (
        <article className="beranda-stat-card" key={label}>
          <span>{label}</span>
          <strong>—</strong>
        </article>
      ))}
    </section>
  );
}

function RecentActivities() {
  // Belum menggunakan data contoh.
  // Nantinya aktivitas akan diambil dari backend.
  const activities = [];

  return (
    <section className="beranda-activity-card">
      <div className="beranda-activity-heading">
        <h2>Aktivitas Terbaru</h2>
      </div>

      {activities.length > 0 ? (
        <ul>
          {activities.map((activity) => (
            <li key={activity.id}>
              <span>{activity.description}</span>
              <time>{activity.time}</time>
            </li>
          ))}
        </ul>
      ) : (
        <div className="beranda-activity-empty">
          Aktivitas akan ditampilkan setelah data terhubung.
        </div>
      )}
    </section>
  );
}

export default function Beranda() {
  return (
    <div className="beranda-page">
      <PageHeader />
      <DocumentStats />
      <RecentActivities />

      <footer className="beranda-footer">
        C-BIJAK <span>•</span> Portal pengetahuan internal
      </footer>
    </div>
  );
}