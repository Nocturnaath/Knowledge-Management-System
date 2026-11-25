
import { useEffect, useMemo, useState } from 'react';
import { FileText, FileSpreadsheet, File, FileType } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import './InformasiUmum.css';
import { spreadsheetToPreviewHtml } from '../utils/spreadsheetPreview';
import { sanitizePreviewHtml } from '../utils/sanitizePreviewHtml';
import { motion, AnimatePresence } from 'motion/react';
import { ReactLenis } from 'lenis/react';

const formatTanggal = (nilai) =>
  new Date(nilai).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

// Menentukan ikon berdasarkan ekstensi file
const getFileIcon = (fileName) => {
  const namaFile = fileName?.split(/[?#]/)[0];
  const extension = namaFile?.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'pdf':
      return {
        icon: FileType,
        className: 'pdf'
      };

    case 'doc':
    case 'docx':
      return {
        icon: FileText,
        className: 'word'
      };

    case 'xls':
    case 'xlsx':
      return {
        icon: FileSpreadsheet,
        className: 'excel'
      };

    default:
      return {
        icon: File,
        className: 'other'
      };
  }
};

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
        setTab((current) => current || data.kategori?.[0] || '');
        setDokumen(Array.isArray(data.dokumen) ? data.dokumen : []);
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
      dokumen.filter((d) =>
        d.kategori === tab &&
        (!kata ||
          `${d.judul || ''} ${d.deskripsi || ''} ${d.extractedText || ''}`
            .toLowerCase()
            .includes(kata))
      ),
    [dokumen, tab, kata]
  );

  const tanggal = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const unduh = () => {
    if (dipilih) {
      const fileUrl = dipilih.fileUrl
        ? `${API_URL}${dipilih.fileUrl}`
        : `${API_URL}/document-files/${encodeURIComponent(dipilih.storedFileName)}?token=${encodeURIComponent(token)}`;

      window.open(fileUrl, '_blank');
    }
  };

  const bukaPratinjau = async (dokumen) => {
    setDipilih(dokumen);
    setPratinjau(null);
    setVersi([]);
    setErrorPratinjau('');
    setMemuatPratinjau(true);

    try {
      const versionsResponse = await fetch(
        `${API_URL}/api/dokumen/${dokumen.id}/versions`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const versionsData = await versionsResponse.json();

      if (!versionsResponse.ok || !versionsData.success) {
        throw new Error(versionsData.message);
      }

      setVersi(versionsData.versions);

      const extension = dokumen.fileName?.split('.').pop()?.toLowerCase();

      if (extension === 'pdf') {
        setPratinjau({ type: 'pdf' });
      } else if (extension === 'doc') {
        const response = await fetch(
          `${API_URL}/api/dokumen/preview/${encodeURIComponent(dokumen.storedFileName)}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message);
        }

        setPratinjau({ type: 'text', value: data.text });
      } else {
        const fileUrl = dokumen.fileUrl
          ? `${API_URL}${dokumen.fileUrl}`
          : `${API_URL}/document-files/${encodeURIComponent(dokumen.storedFileName)}?token=${encodeURIComponent(token)}`;

        const response = await fetch(fileUrl);

        if (!response.ok) {
          throw new Error('File tidak dapat dibaca.');
        }

        const buffer = await response.arrayBuffer();

        if (extension === 'docx') {
          const mammoth = await import('mammoth');
          const result = await mammoth.convertToHtml({ arrayBuffer: buffer });

          setPratinjau({ type: 'html', value: result.value });
        } else if (extension === 'xls' || extension === 'xlsx') {
          const XLSX = await import('xlsx');
          const workbook = XLSX.read(buffer, { type: 'array' });
          const value = spreadsheetToPreviewHtml(workbook, XLSX);

          setPratinjau({ type: 'html', value });
        } else {
          throw new Error('Format file belum didukung untuk pratinjau.');
        }
      }
    } catch (requestError) {
      setErrorPratinjau(
        requestError.message || 'File tidak dapat dipratinjau.'
      );
    } finally {
      setMemuatPratinjau(false);
    }
  };

  return (
    <div className="informasi-umum">
      <div className="iu-head">
        <div>
          <h1>Informasi Umum</h1>
          <p className="iu-sub">
            Notulensi, memorandum, dan dokumen publik lintas divisi.
          </p>
        </div>

        <div className="iu-tanggal">{tanggal}</div>
      </div>

      <div className="iu-cari">
        <input
          type="text"
          placeholder="Cari judul atau isi dokumen"
          aria-label="Cari judul atau isi dokumen"
          value={cari}
          onChange={(e) => setCari(e.target.value)}
        />
      </div>

      <div
        className="iu-tab"
        role="tablist"
        aria-label="Kategori informasi umum"
      >
        {kategori.map((nama) => (
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

      <div className="iu-tabel">
        <div className="iu-baris iu-kepala iu-dokumen-kepala">
          <span>Judul Dokumen</span>
          <span>Deskripsi</span>
          <span>Tanggal</span>
        </div>

        {loading ? (
          <div className="iu-kosong">Memuat dokumen...</div>
        ) : error ? (
          <div className="iu-kosong error">{error}</div>
        ) : daftar.length === 0 ? (
          <div className="iu-kosong">
            {kata
              ? 'Tidak ada dokumen yang cocok.'
              : `Belum ada ${tab} yang dipublikasikan.`}
          </div>
        ) : (
          daftar.map((d) => {
            const fileInfo = getFileIcon(
              d.fileName || d.storedFileName || d.fileUrl
            );

            const FileIcon = fileInfo.icon;

            return (
              <button
                type="button"
                className="iu-baris iu-dokumen-baris"
                key={d.id}
                onClick={() => bukaPratinjau(d)}
              >
                <strong className="iu-dokumen-judul">
                  <span
                    className={`iu-file-icon ${fileInfo.className}`}
                    aria-hidden="true"
                  >
                    <FileIcon size={23} strokeWidth={1.8} />
                  </span>

                  <span>{d.judul}</span>
                </strong>

                <span>{d.deskripsi || '-'}</span>

                <time>{formatTanggal(d.tanggal)}</time>
              </button>
            );
          })
        )}
      </div>

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

              <button
                type="button"
                className="iu-tutup"
                onClick={() => setDipilih(null)}
              >
                Tutup
              </button>
            </div>

            <p className="iu-meta">
              {dipilih.kategori} · v1.0 · {dipilih.pengunggah} ·{' '}
              {formatTanggal(dipilih.tanggal)}
            </p>

            {memuatPratinjau && (
              <div className="iu-pesan">Memuat pratinjau...</div>
            )}

            {errorPratinjau && (
              <div className="iu-pesan error">{errorPratinjau}</div>
            )}

            {!memuatPratinjau &&
              !errorPratinjau &&
              pratinjau?.type === 'pdf' && (
                <iframe
                  className="iu-frame"
                  title={`Pratinjau ${dipilih.judul}`}
                  src={
                    dipilih.fileUrl
                      ? `${API_URL}${dipilih.fileUrl}`
                      : `${API_URL}/document-files/${encodeURIComponent(dipilih.storedFileName)}?token=${encodeURIComponent(token)}`
                  }
                />
              )}

            {!memuatPratinjau &&
              !errorPratinjau &&
              pratinjau?.type === 'text' && (
                <pre className="iu-isi">{pratinjau.value}</pre>
              )}

            {!memuatPratinjau &&
              !errorPratinjau &&
              pratinjau?.type === 'html' && (
                <div
                  className="iu-isi"
                  dangerouslySetInnerHTML={{
                    __html: sanitizePreviewHtml(pratinjau.value)
                  }}
                />
              )}

            <h3 className="iu-riwayat">Riwayat Versi</h3>

            <div className="iu-versi">
              <div className="iu-versi-list">
                {versi.map((item) => (
                  <div className="iu-versi" key={item.id}>
                    <div>
                      <strong>v{item.version} •</strong>{' '}
                      {item.eventType === 'upload'
                        ? 'Dokumen pertama diunggah'
                        : 'Pembaruan dokumen'}

                      <small>Diunggah oleh {item.uploader}</small>
                    </div>

                    <span>{formatTanggal(item.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>

            <button type="button" className="iu-unduh" onClick={unduh}>
              Unduh File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
