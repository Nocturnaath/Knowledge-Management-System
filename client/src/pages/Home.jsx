import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // untuk pindah halaman tanpa reload
import { FileText } from 'lucide-react';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import './Home.css';                             // gaya khusus halaman ini
import SiteFooter from '../components/SiteFooter';

// Logo kecil di pojok kiri atas
const Logo = () => (
  <div className="home-logo">
    <img src="/logo-cbijak.png" alt="Logo C-BIJAK" className="logo" />
    <span>Basis Informasi dan Jejak Aplikasi Kemayoran</span>
  </div>
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
  const { user, logout } = useAuth();
  const [publicDocuments, setPublicDocuments] = useState([]);
  const [search, setSearch] = useState('');
  const [previewDocument, setPreviewDocument] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/api/public/documents`)
      .then((response) => response.json())
      .then((data) => {
        if (data.success) setPublicDocuments(data.dokumen || []);
      })
      .catch(() => {});
  }, []);

  const visibleDocuments = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('id-ID');
    return publicDocuments.filter((document) =>
      !query || `${document.judul} ${document.deskripsi}`.toLocaleLowerCase('id-ID').includes(query),
    );
  }, [publicDocuments, search]);

  const masuk = () => {
    if (user) {
      const enteredAt = Number(sessionStorage.getItem('cbijak_landing_started_at') || 0);
      if (enteredAt && Date.now() - enteredAt <= 2 * 60 * 1000) {
        navigate('/dashboard');
        return;
      }
      logout();
    }
    navigate('/login');
  };

  const openPreview = async (document) => {
    setPreviewDocument(document);
    setPreview(null);
    setPreviewError('');
    setPreviewLoading(true);

    const extension = document.fileName?.split('.').pop()?.toLowerCase();
    const fileUrl = `${API_URL}${document.fileUrl}`;
    try {
      if (extension === 'pdf') {
        setPreview({ type: 'pdf', url: fileUrl });
      } else if (extension === 'docx' || extension === 'xls' || extension === 'xlsx') {
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error('File tidak dapat dibaca.');
        const buffer = await response.arrayBuffer();
        if (extension === 'docx') {
          const mammoth = await import('mammoth');
          const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
          setPreview({ type: 'html', value: result.value });
        } else {
          const XLSX = await import('xlsx');
          const workbook = XLSX.read(buffer, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const html = XLSX.utils.sheet_to_html(workbook.Sheets[sheetName] || {});
          setPreview({ type: 'html', value: html });
        }
      } else {
        throw new Error('Format file belum didukung untuk pratinjau.');
      }
    } catch (error) {
      setPreviewError(error.message || 'File tidak dapat dipratinjau.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const downloadPreview = async () => {
    if (!previewDocument?.fileUrl) return;
    const fileUrl = `${API_URL}${previewDocument.fileUrl}`;
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error('File tidak dapat diunduh.');
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = previewDocument.fileName || previewDocument.judul || 'dokumen';
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setPreviewError(error.message || 'File tidak dapat diunduh.');
    }
  };

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
          <button className="btn-masuk" onClick={masuk}>Masuk</button>
        </div>
        <div className="hero-art-wrap">
          <div className="hero-art" aria-hidden="true">
            <div className="hero-orbit hero-orbit-one">
              <span className="orbit-document" />
            </div>
            <div className="hero-orbit hero-orbit-two">
              <span className="orbit-folder" />
            </div>
            <div className="hero-orbit hero-orbit-three">
              <span className="orbit-document orbit-document-small" />
            </div>
          </div>
          <section className="home-public-info" aria-labelledby="informasi-umum-title">
            <h2 id="informasi-umum-title">Informasi Umum</h2>
            <p>Informasi publik yang dapat langsung diakses</p>
            <div className="home-public-list">
              {visibleDocuments.map((document) => (
                <button type="button" className="home-public-document" key={document.id} onClick={() => openPreview(document)}>
                  <span className="home-public-document-icon" aria-hidden="true">
                    <FileText size={20} strokeWidth={2} />
                  </span>
                  <span>
                    <strong>{document.judul}</strong>
                    <small>• Oleh {document.pengunggah || 'C-bijak'}</small>
                  </span>
                </button>
              ))}
              {visibleDocuments.length === 0 && <p className="home-public-empty">Belum ada informasi yang dipublikasikan.</p>}
            </div>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari Judul Dokumen"
              aria-label="Cari judul dokumen"
            />
          </section>
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
      {previewDocument && (
        <div className="home-preview-backdrop" onClick={() => setPreviewDocument(null)}>
          <section className="home-preview-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header>
              <h2>{previewDocument.judul}</h2>
              <button type="button" onClick={() => setPreviewDocument(null)}>Tutup</button>
            </header>
            {previewLoading && <p className="home-preview-message">Memuat pratinjau...</p>}
            {previewError && <p className="home-preview-message error">{previewError}</p>}
            {!previewLoading && !previewError && preview?.type === 'pdf' && (
              <iframe title={`Pratinjau ${previewDocument.judul}`} src={preview.url} />
            )}
            {!previewLoading && !previewError && preview?.type === 'html' && (
              <div className="home-preview-html" dangerouslySetInnerHTML={{ __html: preview.value }} />
            )}
            {previewDocument && (
              <button type="button" className="home-preview-download" onClick={downloadPreview}>
                Unduh File
              </button>
            )}
          </section>
        </div>
      )}
      <SiteFooter />
    </div>
  );
}
