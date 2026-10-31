
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import './Beranda.css';

const documentStats = [
  { label: 'Total Dokumen', key: 'totalDocuments', path: '/dokumen-divisi' },
  { label: 'Dokumen Saya', key: 'ownDocuments', path: '/dokumen' },
  { label: 'Menunggu Persetujuan', key: 'pendingDocuments', path: '/dokumen?status=pending' },
];

function formatActivityDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

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

function DocumentStats({ counts, onNavigate }) {
  return (
    <section
      className="beranda-stats"
      aria-label="Ringkasan dokumen"
    >
      {documentStats.map(({ label, key, path }) => (
        <button className="beranda-stat-card" key={label} type="button" onClick={() => onNavigate(path)}>
          <span>{label}</span>
          <strong>{counts[key]}</strong>
        </button>
      ))}
    </section>
  );
}

function RecentActivities({ activities }) {
  return (
    <section className="beranda-activity-card">
      <div className="beranda-activity-heading">
        <h2>Aktivitas Terbaru</h2>
      </div>

      {activities.length > 0 ? (
        <ul>
          {activities.map((activity) => (
            <li key={activity.id}>
              <span>
                <b>{activity.uploader}</b> {activity.eventType === 'update' ? 'memperbarui' : 'mengunggah'} dokumen <b>{activity.documentName}</b>
              </span>
              <time>{formatActivityDate(activity.createdAt)}</time>
            </li>
          ))}
        </ul>
      ) : (
        <div className="beranda-activity-empty">
          Belum ada aktivitas dokumen di divisi Anda.
        </div>
      )}
    </section>
  );
}

export default function Beranda() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [counts, setCounts] = useState({
    totalDocuments: 0,
    ownDocuments: 0,
    pendingDocuments: 0,
  });
  const [activities, setActivities] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const response = await fetch(`${API_URL}/api/dokumen/ringkasan`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Gagal mengambil ringkasan dokumen.');
        }
        setCounts(data.counts);
        setActivities(data.activities);
      } catch (requestError) {
        setError(requestError.message);
      }
    };

    loadSummary();
  }, [token]);

  return (
    <div className="beranda-page">
      <PageHeader />
      <DocumentStats counts={counts} onNavigate={(path) => navigate(path)} />
      <RecentActivities activities={activities} />
      {error && <p className="beranda-error">{error}</p>}

      <footer className="beranda-footer">
        C-BIJAK <span>•</span> Portal pengetahuan internal
      </footer>
    </div>
  );
}