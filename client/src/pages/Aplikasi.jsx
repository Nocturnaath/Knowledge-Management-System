import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import './Aplikasi.css';

export default function Aplikasi() {
  const { token } = useAuth();

  const [aplikasi, setAplikasi] = useState([]);
  const [daftarRumpun, setDaftarRumpun] = useState([]);
  const [lihatSemua, setLihatSemua] = useState(true);
  const [cari, setCari] = useState('');
  const [rumpunDipilih, setRumpunDipilih] = useState('semua');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Ambil daftar aplikasi (sudah disaring server sesuai divisi pengguna)
  useEffect(() => {
    const muat = async () => {
      try {
        const res = await fetch(`${API_URL}/api/aplikasi`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.status === 404) {
          setError('Rute /api/aplikasi tidak ditemukan. Pastikan server sudah dijalankan ulang.');
          return;
        }
        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.message || 'Gagal memuat daftar aplikasi.');
          return;
        }
        setAplikasi(data.aplikasi);
        setDaftarRumpun(data.rumpun);
        setLihatSemua(data.lihatSemua);
      } catch (err) {
        setError('Tidak dapat terhubung ke server.');
      } finally {
        setLoading(false);
      }
    };
    muat();
  }, [token]);

  // Hanya rumpun yang punya aplikasi untuk pengguna ini
  const rumpunTersedia = useMemo(
    () => daftarRumpun.filter((r) => aplikasi.some((a) => a.rumpunId === r.id)),
    [daftarRumpun, aplikasi]
  );

  // Saring berdasarkan kata kunci dan rumpun
  const tampil = useMemo(() => {
    const kata = cari.trim().toLowerCase();
    return aplikasi.filter((a) => {
      const cocokRumpun = rumpunDipilih === 'semua' || String(a.rumpunId) === rumpunDipilih;
      const cocokKata = !kata || a.nama.toLowerCase().includes(kata);
      return cocokRumpun && cocokKata;
    });
  }, [aplikasi, cari, rumpunDipilih]);

  const tanggal = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="apl-page">
      <div className="apl-head">
        <div>
          <h1>Aplikasi</h1>
          <p className="apl-sub">
            Jelajahi dokumentasi berdasarkan aplikasi yang tersedia di lingkungan PPKK
          </p>
        </div>
        <div className="apl-tanggal">{tanggal}</div>
      </div>

      <div className="apl-filter">
        <div className="apl-cari">
          <input
            type="text"
            placeholder="Cari Nama Aplikasi"
            aria-label="Cari nama aplikasi"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
          />
        </div>

        {/* Dropdown rumpun tampil jika ada rumpun yang tersedia */}
        {rumpunTersedia.length > 0 && (
          <div className="apl-select">
            <select
              aria-label="Filter rumpun aplikasi"
              value={rumpunDipilih}
              onChange={(e) => setRumpunDipilih(e.target.value)}
            >
              <option value="semua">Rumpun Aplikasi (Semua)</option>
              {rumpunTersedia.map((r) => (
                <option key={r.id} value={String(r.id)}>{r.nama}</option>
              ))}
            </select>
            <ChevronDown size={20} />
          </div>
        )}
      </div>

      <div className="apl-info">
        {lihatSemua
          ? 'Seksi Sistem Informasi dapat mengelola dokumentasi seluruh aplikasi.'
          : 'Menampilkan aplikasi yang dikelola oleh divisi Anda.'}
      </div>

      {loading && <div className="apl-pesan">Memuat daftar aplikasi...</div>}
      {error && <div className="apl-pesan error">{error}</div>}
      {!loading && !error && tampil.length === 0 && (
        <div className="apl-pesan">Tidak ada aplikasi yang cocok.</div>
      )}

      <div className="apl-grid">
        {tampil.map((a) => {
          const lengkap = a.terisi >= 10;
          return (
            <article className="apl-card" key={a.id}>
              <h3>{a.nama}</h3>
              <div className="apl-skor">{a.terisi}/10</div>
              <div className="apl-foot">
                <Link to={`/aplikasi/${a.id}`} className="apl-detail">← Lihat Detail</Link>
                <span className={`apl-badge ${lengkap ? 'lengkap' : 'belum'}`}>
                  {lengkap ? 'Lengkap' : 'Belum Lengkap'}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}