import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Search } from 'lucide-react';
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
  const [rumpunTerbuka, setRumpunTerbuka] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const rumpunFilterRef = useRef(null);

  useEffect(() => {
    if (!rumpunTerbuka) return undefined;

    const tutupDiLuar = (event) => {
      if (rumpunFilterRef.current && !rumpunFilterRef.current.contains(event.target)) {
        setRumpunTerbuka(false);
      }
    };
    const tutupDenganEscape = (event) => {
      if (event.key === 'Escape') setRumpunTerbuka(false);
    };

    document.addEventListener('mousedown', tutupDiLuar);
    document.addEventListener('keydown', tutupDenganEscape);
    return () => {
      document.removeEventListener('mousedown', tutupDiLuar);
      document.removeEventListener('keydown', tutupDenganEscape);
    };
  }, [rumpunTerbuka]);

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
      const cocokKata = !kata
        || a.nama.toLowerCase().includes(kata)
        || (a.tags || []).some((tag) => tag.toLowerCase().includes(kata));
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
          <Search size={19} strokeWidth={1.8} aria-hidden="true" />
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
          <div className="apl-select" ref={rumpunFilterRef}>
            <button
              className={`apl-select-toggle${rumpunTerbuka ? ' open' : ''}`}
              type="button"
              aria-label="Filter rumpun aplikasi"
              aria-expanded={rumpunTerbuka}
              aria-controls="apl-rumpun-options"
              onClick={() => setRumpunTerbuka((open) => !open)}
            >
              <span>{rumpunDipilih === 'semua'
                ? 'Rumpun Aplikasi (Semua)'
                : rumpunTersedia.find((r) => String(r.id) === rumpunDipilih)?.nama}</span>
              <ChevronDown className="apl-select-chevron" size={18} aria-hidden="true" />
            </button>
            {rumpunTerbuka && (
              <div className="apl-select-options" id="apl-rumpun-options" role="group" aria-label="Pilih rumpun aplikasi">
                {[
                  { id: 'semua', nama: 'Rumpun Aplikasi (Semua)' },
                  ...rumpunTersedia.map((rumpun) => ({ id: String(rumpun.id), nama: rumpun.nama }))
                ].map((rumpun) => (
                  <button
                    className={rumpunDipilih === String(rumpun.id) ? 'selected' : ''}
                    key={rumpun.id}
                    type="button"
                    onClick={() => {
                      setRumpunDipilih(String(rumpun.id));
                      setRumpunTerbuka(false);
                    }}
                  >
                    {rumpun.nama}
                  </button>
                ))}
              </div>
            )}
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
              {a.tags?.length > 0 && (
                <div className="apl-tags">
                  {a.tags.map((tag) => <span key={tag}>{tag}</span>)}
                </div>
              )}
              <div className="apl-rumpun-row">
                <span>Rumpun {a.rumpun}</span>
              </div>
              <div className="apl-skor" title="Kelengkapan dokumentasi">{a.terisi}/10</div>
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
