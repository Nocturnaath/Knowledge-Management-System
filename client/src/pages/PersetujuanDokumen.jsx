import React, { useMemo, useState } from 'react';
import './PersetujuanDokumen.css';

// Ubah ke false untuk melihat tampilan kosong ("Tidak ada dokumen yang perlu di review").
// Nanti seluruh data contoh ini diganti dengan data dari server.
const PAKAI_DATA_CONTOH = true;

const MENUNGGU = PAKAI_DATA_CONTOH
  ? [
      { id: 1, judul: 'Kebijakan Backup Data Server', pengunggah: 'Kento Nanami', tanggal: '4 Sep 2026' },
      { id: 2, judul: 'SOP Deployment Aplikasi', pengunggah: 'Satoru Gojo', tanggal: '7 Sep 2026' }
    ]
  : [];

const RIWAYAT = PAKAI_DATA_CONTOH
  ? [
      { id: 3, judul: 'Panduan Penggunaan C-Mark', pengunggah: 'Satoru Gojo', tanggal: '4 Sep 2026', keputusan: 'Disetujui' },
      { id: 4, judul: 'Memo Dinas Maintenance', pengunggah: 'Kento Nanami', tanggal: '7 Sep 2026', keputusan: 'Ditolak' }
    ]
  : [];

export default function PersetujuanDokumen() {
  const [tab, setTab] = useState('menunggu');
  const [cari, setCari] = useState('');

  const tanggal = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const daftar = useMemo(() => {
    const kata = cari.trim().toLowerCase();
    const sumber = tab === 'menunggu' ? MENUNGGU : RIWAYAT;
    return sumber.filter((d) => !kata || d.judul.toLowerCase().includes(kata));
  }, [tab, cari]);

  const kosong =
    cari.trim()
      ? 'Tidak ada dokumen yang cocok.'
      : tab === 'menunggu'
        ? 'Tidak ada dokumen yang perlu di review'
        : 'Belum ada riwayat persetujuan.';

  const proses = () => {
    alert('Halaman tinjau dokumen akan dibuat setelah fitur unggah dokumen selesai.');
  };

  return (
    <div className="ps-page">
      <div className="ps-head">
        <div>
          <h1>Persetujuan Dokumen</h1>
          <p className="ps-sub">Dokumen yang membutuhkan persetujuan akan muncul di sini.</p>
        </div>
        <div className="ps-tanggal">{tanggal}</div>
      </div>

      <div className="ps-cari">
        <input
          type="text"
          placeholder="Cari Judul Dokumen"
          aria-label="Cari judul dokumen"
          value={cari}
          onChange={(e) => setCari(e.target.value)}
        />
      </div>

      <div className="ps-tab">
        <button
          type="button"
          className={tab === 'menunggu' ? 'aktif' : ''}
          onClick={() => setTab('menunggu')}
        >
          Menunggu Persetujuan{MENUNGGU.length > 0 ? ` (${MENUNGGU.length})` : ''}
        </button>
        <button
          type="button"
          className={tab === 'riwayat' ? 'aktif' : ''}
          onClick={() => setTab('riwayat')}
        >
          Riwayat Persetujuan
        </button>
      </div>

      <div className="ps-tabel">
        <div className="ps-baris ps-kepala">
          <span>Judul Dokumen</span>
          <span>Pengunggah</span>
          <span>Tanggal</span>
          <span>{tab === 'menunggu' ? 'Status' : 'Keputusan'}</span>
          <span>Aksi</span>
        </div>

        {daftar.length === 0 && <div className="ps-kosong">{kosong}</div>}

        {daftar.map((d) => (
          <div className="ps-baris" key={d.id}>
            <span className="ps-judul">{d.judul}</span>
            <span>{d.pengunggah}</span>
            <span>{d.tanggal}</span>
            <span>
              {tab === 'menunggu' ? (
                <span className="ps-badge menunggu">Menunggu Persetujuan</span>
              ) : (
                <span className={`ps-badge ${d.keputusan === 'Disetujui' ? 'disetujui' : 'ditolak'}`}>
                  {d.keputusan}
                </span>
              )}
            </span>
            <button type="button" className="ps-aksi" onClick={proses}>
              {tab === 'menunggu' ? 'Tinjau' : 'Detail'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}