import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import './InformasiUmum.css';

const TAB_KONTAK = 'Kontak IT';

// GANTI dengan data kontak IT yang sebenarnya
const KONTAK_IT = [
  { nama: 'Helpdesk IT Support', tugas: 'Kendala teknis harian dan pengajuan tiket', kontak: 'Ext. 000' },
  { nama: 'Staf Jaringan & Server', tugas: 'Jaringan, server, dan akses VPN', kontak: 'Ext. 000' },
  { nama: 'Pengembangan Aplikasi', tugas: 'Pertanyaan dan masukan terkait aplikasi', kontak: 'Ext. 000' }
];

const formatTanggal = (nilai) =>
  new Date(nilai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

export default function InformasiUmum() {
  const { token } = useAuth();
  const [dokumen, setDokumen] = useState([]);
  const [kategori, setKategori] = useState([]);
  const [tab, setTab] = useState('');
  const [cari, setCari] = useState('');
  const [dipilih, setDipilih] = useState(null); // dokumen yang sedang dipratinjau
  const [pratinjau, setPratinjau] = useState(null);
  const [versi, setVersi] = useState([]);
  const [memuatPratinjau, setMemuatPratinjau] = useState(false);
  const [errorPratinjau, setErrorPratinjau] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Ambil dokumen publik dari server
  useEffect(() => {
    const muat = async () => {
      try {
        const res = await fetch(`${API_URL}/api/informasi-umum`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setError(data.message || 'Gagal memuat informasi umum.');
          return;
        }
        setKategori(data.kategori || []);
        setTab((current) => current || data.kategori?.[0] || TAB_KONTAK);
        setDokumen(data.dokumen);
      } catch (err) {
        setError('Tidak dapat terhubung ke server.');
      } finally {
        setLoading(false);
      }
    };
    muat();
  }, [token]);

  // Tutup jendela pratinjau dengan tombol Esc
  useEffect(() => {
    if (!dipilih) return undefined;
    const tutup = (e) => {
      if (e.key === 'Escape') setDipilih(null);
    };
    window.addEventListener('keydown', tutup);
    return () => window.removeEventListener('keydown', tutup);
  }, [dipilih]);

  const kata = cari.trim().toLowerCase();

  const daftar = useMemo(
    () =>
      dokumen.filter((d) => d.kategori === tab && (!kata || d.judul.toLowerCase().includes(kata))),
    [dokumen, tab, kata]
  );

  const kontak = KONTAK_IT.filter((k) => !kata || k.nama.toLowerCase().includes(kata));

  const tanggal = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const unduh = () => {
    if (dipilih?.storedFileName) {
      window.open(`${API_URL}/document-files/${encodeURIComponent(dipilih.storedFileName)}`, '_blank');
    }
  };

  const bukaPratinjau = async (dokumen) => {
    setDipilih(dokumen);
    setPratinjau(null);
    setVersi([]);
    setErrorPratinjau('');
    setMemuatPratinjau(true);
    try {
      const versionsResponse = await fetch(`${API_URL}/api/dokumen/${dokumen.id}/versions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const versionsData = await versionsResponse.json();
      if (!versionsResponse.ok || !versionsData.success) throw new Error(versionsData.message);
      setVersi(versionsData.versions);

      const extension = dokumen.fileName?.split('.').pop()?.toLowerCase();
      if (extension === 'pdf') {
        setPratinjau({ type: 'pdf' });
      } else if (extension === 'doc') {
        const response = await fetch(`${API_URL}/api/dokumen/preview/${encodeURIComponent(dokumen.storedFileName)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message);
        setPratinjau({ type: 'text', value: data.text });
      } else {
        const response = await fetch(`${API_URL}/document-files/${encodeURIComponent(dokumen.storedFileName)}`);
        if (!response.ok) throw new Error('File tidak dapat dibaca.');
        const buffer = await response.arrayBuffer();
        if (extension === 'docx') {
          const mammoth = await import('mammoth');
          const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
          setPratinjau({ type: 'html', value: result.value });
        } else if (extension === 'xls' || extension === 'xlsx') {
          const XLSX = await import('xlsx');
          const workbook = XLSX.read(buffer, { type: 'array' });
          const value = workbook.SheetNames.map((sheetName) => (
            `<h3>${sheetName}</h3>${XLSX.utils.sheet_to_html(workbook.Sheets[sheetName])}`
          )).join('');
          setPratinjau({ type: 'html', value });
        } else {
          throw new Error('Format file belum didukung untuk pratinjau.');
        }
      }
    } catch (requestError) {
      setErrorPratinjau(requestError.message || 'File tidak dapat dipratinjau.');
    } finally {
      setMemuatPratinjau(false);
    }
  };

  return (
    <div className="informasi-umum">
      <div className="iu-head">
        <div>
          <h1>Informasi Umum</h1>
          <p className="iu-sub">Notulensi, memorandum, dokumen publik lintas divisi, dan kontak IT.</p>
        </div>
        <div className="iu-tanggal">{tanggal}</div>
      </div>

      <div className="iu-cari">
        <input
          type="text"
          placeholder="Cari Judul Dokumen"
          aria-label="Cari judul dokumen"
          value={cari}
          onChange={(e) => setCari(e.target.value)}
        />
      </div>

      <div className="iu-tab" role="tablist" aria-label="Kategori informasi umum">
        {[...kategori, TAB_KONTAK].map((nama) => (
          <button
            key={nama}
            type="button"
            role="tab"
            aria-selected={tab === nama}
            className={tab === nama ? 'aktif' : ''}
            onClick={() => setTab(nama)}
          >
            {nama}
          </button>
        ))}
      </div>

      {tab === TAB_KONTAK ? (
        <div className="iu-kontak">
          {kontak.length === 0 && <div className="iu-pesan">Kontak tidak ditemukan.</div>}
          {kontak.map((k) => (
            <div className="iu-kontak-baris" key={k.nama}>
              <strong>{k.nama}</strong>
              <span>{k.tugas}</span>
              <span>{k.kontak}</span>
            </div>
          ))}
        </div>
      ) : (
        <>
          {loading && <div className="iu-pesan">Memuat dokumen...</div>}
          {error && <div className="iu-pesan error">{error}</div>}
          {!loading && !error && daftar.length === 0 && (
            <div className="iu-pesan">
              {kata ? 'Tidak ada dokumen yang cocok.' : `Belum ada ${tab} yang dipublikasikan.`}
            </div>
          )}

          <div className="iu-daftar">
            {daftar.map((d) => (
              <button type="button" className="iu-item" key={d.id} onClick={() => bukaPratinjau(d)}>
                <div>
                  <strong>{d.judul}</strong>
                  <small>{d.deskripsi}</small>
                </div>
                <time>{formatTanggal(d.tanggal)}</time>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Jendela pratinjau: klik area gelap, tombol Tutup, atau Esc untuk menutup */}
      {dipilih && (
        <div className="iu-latar" onClick={() => setDipilih(null)}>
          <div
            className="iu-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="iu-judul-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="iu-modal-head">
              <h2 id="iu-judul-modal">{dipilih.judul}</h2>
              <button type="button" className="iu-tutup" onClick={() => setDipilih(null)}>Tutup</button>
            </div>
            <p className="iu-meta">
              {dipilih.kategori} · v1.0 · {dipilih.pengunggah} · {formatTanggal(dipilih.tanggal)}
            </p>

            {memuatPratinjau && <div className="iu-pesan">Memuat pratinjau...</div>}
            {errorPratinjau && <div className="iu-pesan error">{errorPratinjau}</div>}
            {!memuatPratinjau && !errorPratinjau && pratinjau?.type === 'pdf' && (
              <iframe
                className="iu-frame"
                title={`Pratinjau ${dipilih.judul}`}
                src={`${API_URL}/document-files/${encodeURIComponent(dipilih.storedFileName)}`}
              />
            )}
            {!memuatPratinjau && !errorPratinjau && pratinjau?.type === 'text' && (
              <pre className="iu-isi">{pratinjau.value}</pre>
            )}
            {!memuatPratinjau && !errorPratinjau && pratinjau?.type === 'html' && (
              <div className="iu-isi" dangerouslySetInnerHTML={{ __html: pratinjau.value }} />
            )}

            <h3 className="iu-riwayat">Riwayat Versi</h3>
            <div className="iu-versi">
              <div className="iu-versi-list">
                {versi.map((item) => (
                  <div className="iu-versi" key={item.id}>
                    <div>
                      <strong>v{item.version} •</strong> {item.eventType === 'upload' ? 'Dokumen pertama diunggah' : 'Pembaruan dokumen'}
                      <small>Diunggah oleh {item.uploader}</small>
                    </div>
                    <span>{formatTanggal(item.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
            <button type="button" className="iu-unduh" onClick={unduh}>Unduh</button>
          </div>
        </div>
      )}
    </div>
  );
}