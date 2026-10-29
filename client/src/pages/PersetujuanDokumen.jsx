import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import './PersetujuanDokumen.css';

function formatDate(value) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function fileExtension(document) {
  return document.fileName?.split('.').pop()?.toLowerCase() || '';
}

export default function PersetujuanDokumen() {
  const { token } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [previewDocument, setPreviewDocument] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [note, setNote] = useState('');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('menunggu');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadDocuments = async () => {
    try {
      const response = await fetch(`${API_URL}/api/dokumen/persetujuan`, {
        headers: { Authorization: 'Bearer ' + token },
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Gagal memuat dokumen.');
      setDocuments(data.documents);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [token]);

  const visibleDocuments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return documents
      .filter((document) => tab === 'menunggu'
        ? document.status === 'pending'
        : document.status !== 'pending')
      .filter((document) => document.name.toLowerCase().includes(query));
  }, [documents, search, tab]);

  const processDocument = async (status) => {
    setSaving(true);
    setActionError('');
    try {
      const response = await fetch(`${API_URL}/api/dokumen/${selectedDocument.id}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, note }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Gagal memproses dokumen.');
      setSelectedDocument(null);
      setNote('');
      await loadDocuments();
    } catch (requestError) {
      setActionError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const openPreview = async (document) => {
    setPreviewDocument(document);
    setPreview(null);
    setPreviewError('');
    setPreviewLoading(true);

    try {
      const extension = fileExtension(document);
      if (extension === 'pdf') {
        setPreview({ type: 'pdf' });
        return;
      }

      if (extension === 'doc') {
        const response = await fetch(
          `${API_URL}/api/dokumen/preview/${encodeURIComponent(document.storedFileName)}`,
          { headers: { Authorization: 'Bearer ' + token } },
        );
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message);
        setPreview({ type: 'text', value: data.text });
        return;
      }

      const response = await fetch(
        `${API_URL}/document-files/${encodeURIComponent(document.storedFileName)}`,
      );
      if (!response.ok) throw new Error('File tidak dapat dibaca.');
      const buffer = await response.arrayBuffer();

      if (extension === 'docx') {
        const mammoth = await import('mammoth');
        const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
        setPreview({ type: 'html', value: result.value });
      } else if (extension === 'xls' || extension === 'xlsx') {
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(buffer, { type: 'array' });
        const value = workbook.SheetNames.map((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          return `<h3>${sheetName}</h3>${XLSX.utils.sheet_to_html(sheet)}`;
        }).join('');
        setPreview({ type: 'html', value });
      } else {
        throw new Error('Format file belum didukung untuk pratinjau.');
      }
    } catch (requestError) {
      setPreviewError(requestError.message || 'File tidak dapat dipratinjau.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const tanggal = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

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
          type="search"
          placeholder="Cari Judul Dokumen"
          aria-label="Cari judul dokumen"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="ps-tab">
        <button
          type="button"
          className={tab === 'menunggu' ? 'aktif' : ''}
          onClick={() => setTab('menunggu')}
        >
          Menunggu Persetujuan ({documents.filter((document) => document.status === 'pending').length})
        </button>
        <button
          type="button"
          className={tab === 'riwayat' ? 'aktif' : ''}
          onClick={() => setTab('riwayat')}
        >
          Riwayat Persetujuan Dokumen
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
        {loading && <div className="ps-kosong">Memuat dokumen...</div>}
        {!loading && error && <div className="ps-kosong error">{error}</div>}
        {!loading && !error && visibleDocuments.length === 0 && (
          <div className="ps-kosong">
            {tab === 'menunggu'
              ? 'Tidak ada dokumen yang perlu di-review.'
              : 'Belum ada riwayat persetujuan dokumen.'}
          </div>
        )}
        {visibleDocuments.map((document) => (
          <div className="ps-baris" key={document.id}>
            <span className="ps-judul">{document.name}</span>
            <span>{document.uploader}</span>
            <span>{formatDate(document.createdAt)}</span>
            <span>
              <span className={`ps-badge ${document.status === 'pending'
                ? 'menunggu'
                : document.status === 'approved' ? 'disetujui' : 'ditolak'}`}>
                {document.status === 'pending'
                  ? 'Menunggu Persetujuan'
                  : document.status === 'approved' ? 'Disetujui' : 'Ditolak'}
              </span>
            </span>
            <button type="button" className="ps-aksi" onClick={() => setSelectedDocument(document)}>
              {tab === 'menunggu' ? 'Tinjau' : 'Detail'}
            </button>
          </div>
        ))}
      </div>

      {selectedDocument && (
        <div className="ps-review-backdrop" onClick={() => setSelectedDocument(null)}>
          <section className="ps-review-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header className="ps-review-header">
              <div>
                <h2>{selectedDocument.name}</h2>
                <span className={`ps-badge ${selectedDocument.status === 'pending'
                  ? 'menunggu'
                  : selectedDocument.status === 'approved' ? 'disetujui' : 'ditolak'}`}>
                  {selectedDocument.status === 'pending'
                    ? 'Menunggu Persetujuan'
                    : selectedDocument.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                </span>
              </div>
              <button type="button" className="ps-review-close" onClick={() => setSelectedDocument(null)}>← Kembali</button>
            </header>

            <div className="ps-review-content">
              <div className="ps-review-details">
                <p><span>Pengunggah</span><strong>{selectedDocument.uploader}</strong></p>
                <p><span>Divisi</span><strong>{selectedDocument.division || '-'}</strong></p>
                <p><span>Kategori</span><strong>{selectedDocument.category}</strong></p>
                <p><span>Aplikasi</span><strong>{selectedDocument.application || '-'}</strong></p>
                <p><span>Tanggal Unggah</span><strong>{formatDate(selectedDocument.createdAt)}</strong></p>
                <p><span>Deskripsi</span><strong>{selectedDocument.description}</strong></p>
                <button type="button" className="ps-view-file" onClick={() => openPreview(selectedDocument)}>
                  Lihat Dokumen
                </button>
              </div>

              <div className="ps-review-action">
                <label htmlFor="approval-note">Catatan (Opsional)</label>
                <textarea
                  id="approval-note"
                  placeholder="Berikan catatan atau masukan anda....."
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
                {actionError && <p className="ps-action-error">{actionError}</p>}
                {selectedDocument.status === 'pending' && (
                  <div className="ps-review-buttons">
                    <button type="button" className="ps-reject" disabled={saving} onClick={() => processDocument('rejected')}>Tolak</button>
                    <button type="button" className="ps-approve" disabled={saving} onClick={() => processDocument('approved')}>{saving ? 'Memproses...' : 'Setujui'}</button>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {previewDocument && (
        <div className="ps-file-preview-backdrop" onClick={() => setPreviewDocument(null)}>
          <section
            className="ps-file-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ps-file-preview-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="ps-file-preview-header">
              <div>
                <h2 id="ps-file-preview-title">{previewDocument.name}</h2>
                <p>{previewDocument.fileName}</p>
              </div>
              <button type="button" onClick={() => setPreviewDocument(null)}>Tutup</button>
            </header>

            {previewLoading && <div className="ps-file-preview-message">Memuat pratinjau...</div>}
            {previewError && <div className="ps-file-preview-message error">{previewError}</div>}
            {!previewLoading && !previewError && preview?.type === 'pdf' && (
              <iframe
                className="ps-file-preview-frame"
                title={`Pratinjau ${previewDocument.name}`}
                src={`${API_URL}/document-files/${previewDocument.storedFileName}`}
              />
            )}
            {!previewLoading && !previewError && preview?.type === 'text' && (
              <pre className="ps-file-preview-text">{preview.value}</pre>
            )}
            {!previewLoading && !previewError && preview?.type === 'html' && (
              <div
                className="ps-file-preview-html"
                dangerouslySetInnerHTML={{ __html: preview.value }}
              />
            )}

            <a
              className="ps-file-download"
              href={`${API_URL}/document-files/${previewDocument.storedFileName}`}
              download={previewDocument.fileName}
            >
              Unduh Dokumen
            </a>
          </section>
        </div>
      )}
    </div>
  );
}
