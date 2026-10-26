import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import './HakAkses.css';

export default function HakAkses() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('peran'); // 'peran' (default) atau 'pengguna'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Ambil data dari server
  const muat = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/hak-akses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || 'Gagal memuat hak akses.');
        return;
      }
      setData(json);
    } catch (err) {
      setError('Tidak dapat terhubung ke server.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    muat();
  }, [muat]);

  // Mengubah satu kotak centang. jenis = 'peran' atau 'pengguna'
  const ubah = async (jenis, target, key, nilai) => {
    setError('');

    // Perbarui tampilan lebih dulu supaya terasa cepat
    const cocok = (item) => (jenis === 'peran' ? item.key === target : item.id === target);
    setData((d) => ({
      ...d,
      [jenis]: d[jenis].map((item) =>
        cocok(item)
          ? {
              ...item,
              izin: nilai
                ? [...new Set([...item.izin, key])]
                : item.izin.filter((k) => k !== key)
            }
          : item
      )
    }));

    try {
      const res = await fetch(`${API_URL}/api/hak-akses/${jenis}/${target}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ perm_key: key, allowed: nilai })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Gagal menyimpan perubahan.');
    } catch (err) {
      setError(err.message === 'Failed to fetch' ? 'Tidak dapat terhubung ke server.' : err.message);
    }

    // Selalu sinkronkan dengan data server (sekaligus membatalkan perubahan jika gagal)
    muat();
  };

  const tanggal = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  if (loading) return <div className="ha-pesan">Memuat hak akses...</div>;
  if (!data) return <div className="ha-pesan error">{error}</div>;

  const baris = tab === 'peran' ? data.peran : data.pengguna;

  return (
    <div className="ha-page">
      <div className="ha-head">
        <div>
          <h1>Hak Akses (RBAC)</h1>
          <p className="ha-sub">Atur hak akses granular per pengguna atau per peran.</p>
        </div>
        <div className="ha-tanggal">{tanggal}</div>
      </div>

      <div className="ha-info">
        Sebagai Super Admin, Anda dapat mendelegasikan “Kelola hak akses” ke Admin lewat kolom
        terakhir pada baris Admin.
      </div>

      <div className="ha-tab">
        <button type="button" className={tab === 'pengguna' ? 'aktif' : ''} onClick={() => setTab('pengguna')}>
          Per Pengguna
        </button>
        <button type="button" className={tab === 'peran' ? 'aktif' : ''} onClick={() => setTab('peran')}>
          Per Peran (Default)
        </button>
      </div>

      {error && <div className="ha-pesan error">{error}</div>}

      <div className="ha-tabel">
        <div className="ha-baris ha-kepala">
          <span>Pengguna</span>
          {data.izin.map((i) => (
            <span key={i.key}>{i.label}</span>
          ))}
        </div>

        {baris.map((item) => {
          const kunci = tab === 'peran' ? item.key : item.id;
          const terkunci = (tab === 'peran' ? item.key : item.role) === 'super_admin';
          return (
            <div className="ha-baris" key={kunci}>
              <div className="ha-nama">
                {item.nama}
                {tab === 'pengguna' && <small>{item.jabatan || item.divisi || '-'}</small>}
              </div>
              {data.izin.map((i) => (
                <div className="ha-sel" key={i.key}>
                  <input
                    type="checkbox"
                    aria-label={`${i.label} untuk ${item.nama}`}
                    checked={item.izin.includes(i.key)}
                    disabled={terkunci}
                    onChange={(e) => ubah(tab, kunci, i.key, e.target.checked)}
                  />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}