import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import './DetailAplikasi.css';

export default function DetailAplikasi() {
  const { id } = useParams();
  const { token } = useAuth();
  const [aplikasi, setAplikasi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const muatDetail = async () => {
      try {
        const res = await fetch(`${API_URL}/api/aplikasi`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.message || 'Gagal memuat detail aplikasi.');
          return;
        }

        const detail = data.aplikasi.find((item) => String(item.id) === id);
        if (!detail) {
          setError('Aplikasi tidak ditemukan atau tidak dapat diakses.');
          return;
        }
        setAplikasi(detail);
      } catch (err) {
        setError('Tidak dapat terhubung ke server.');
      } finally {
        setLoading(false);
      }
    };

    muatDetail();
  }, [id, token]);

  if (loading) {
    return <div className="detail-aplikasi-message">Memuat detail aplikasi...</div>;
  }

  if (error) {
    return (
      <div className="detail-aplikasi-message error">
        <p>{error}</p>
        <Link to="/aplikasi" className="detail-back">← Kembali ke Aplikasi</Link>
      </div>
    );
  }

  const lengkap = aplikasi.terisi >= 10;

  return (
    <div className="detail-aplikasi-page">
      <header className="detail-aplikasi-header">
        <div>
          <h1>{aplikasi.nama}</h1>
          <p>{aplikasi.deskripsi || 'Sistem informasi dan dokumentasi aplikasi.'}</p>
        </div>
        <Link to="/aplikasi" className="detail-back">← Kembali</Link>
      </header>

      <div className="detail-aplikasi-summary">
        Kelengkapan dokumentasi: <strong>{aplikasi.terisi}/10</strong>
        <span className={`detail-status ${lengkap ? 'lengkap' : 'belum'}`}>
          {lengkap ? 'Lengkap' : 'Belum Lengkap'}
        </span>
        <span>• Rumpun {aplikasi.rumpun}</span>
      </div>

      <section className="detail-dokumen" aria-labelledby="judul-dokumen">
        <h2 id="judul-dokumen">Dokumen Aplikasi</h2>
        <div className="detail-dokumen-empty">
          Belum ada dokumen untuk aplikasi ini.
        </div>
      </section>
    </div>
  );
}
