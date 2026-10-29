import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import './DokumenDivisi.css';

const statusLabels = {
  approved: 'Disetujui',
  pending: 'Menunggu',
  rejected: 'Ditolak',
};

function extensionOf(document) {
  return document.fileName?.split('.').pop()?.toLowerCase() || '';
}

export default function DokumenDivisi() {
  const { token } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewError, setPreviewError] = useState('');

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const response = await fetch(`${API_URL}/api/dokumen/divisi`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Gagal mengambil dokumen divisi.');
        }
        setDocuments(data.documents);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
  }, [token]);

  const visibleDocuments = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('id-ID');
    return documents.filter((document) =>
      `${document.name} ${document.category || ''}`.toLocaleLowerCase('id-ID').includes(query)
    );
  }, [documents, searchQuery]);

  const openPreview = async (document) => {
    setSelectedDocument(document);
    setPreview(null);
    setPreviewError('');
    setPreviewLoading(true);

    try {
      const extension = extensionOf(document);
      if (extension === 'pdf') {
        setPreview({ type: 'pdf' });
        return;
      }

      if (extension === 'doc') {
        const response = await fetch(`${API_URL}/api/dokumen/preview/${encodeURIComponent(document.storedFileName)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message);
        setPreview({ type: 'text', value: data.text });
        return;
      }

      const response = await fetch(`${API_URL}/document-files/${encodeURIComponent(document.storedFileName)}`);
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
    } catch (previewRequestError) {
      setPreviewError(previewRequestError.message || 'File tidak dapat dipratinjau.');
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="division-page">
      <header className="division-page-header">
        <div>
          <h1>Dokumen Divisi</h1>
          <p>Dokumen divisi termasuk dokumen milik Anda.</p>
        </div>
      </header>

      <label className="division-search">
        <span className="sr-only">Cari dokumen divisi</span>
        <input
          type="search"
          placeholder="Cari Judul Dokumen"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
      </label>

      <section className="division-table-card" aria-label="Daftar dokumen divisi">
        {loading ? <p className="division-message">Memuat dokumen...</p> : null}
        {error ? <p className="division-message error">{error}</p> : null}
        {!loading && !error && visibleDocuments.length === 0 ? (
          <p className="division-message">Belum ada dokumen divisi.</p>
        ) : (
          <div className="division-table-scroll">
            <table className="division-table">
              <thead>
                <tr>
                  <th>Judul Dokumen</th>
                  <th>Pengunggah</th>
                  <th>Kategori</th>
                  <th>Tanggal</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {visibleDocuments.map((document) => (
                  <tr key={document.id}>
                    <td>{document.name}</td>
                    <td>{document.uploader}</td>
                    <td>{document.category}</td>
                    <td>{new Date(document.createdAt).toLocaleDateString('id-ID')}</td>
                    <td>{statusLabels[document.status] || document.status}</td>
                    <td>
                      <button type="button" onClick={() => openPreview(document)}>Lihat</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedDocument && (
        <div className="division-preview-backdrop" onClick={() => setSelectedDocument(null)}>
          <section className="division-preview-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header>
              <div>
                <h2>{selectedDocument.name}</h2>
                <p>{selectedDocument.fileName}</p>
              </div>
              <button type="button" onClick={() => setSelectedDocument(null)}>Tutup</button>
            </header>
            {previewLoading && <div className="division-preview-empty">Memuat pratinjau...</div>}
            {previewError && <div className="division-preview-empty error">{previewError}</div>}
            {!previewLoading && !previewError && preview?.type === 'pdf' && (
              <iframe
                className="division-preview-frame"
                title={`Pratinjau ${selectedDocument.name}`}
                src={`${API_URL}/document-files/${selectedDocument.storedFileName}`}
              />
            )}
            {!previewLoading && !previewError && preview?.type === 'text' && (
              <pre className="division-preview-text">{preview.value}</pre>
            )}
            {!previewLoading && !previewError && preview?.type === 'html' && (
              <div className="division-preview-html" dangerouslySetInnerHTML={{ __html: preview.value }} />
            )}
            <a
              className="division-download"
              href={`${API_URL}/document-files/${selectedDocument.storedFileName}`}
              download={selectedDocument.fileName}
            >
              Unduh File
            </a>
          </section>
        </div>
      )}
    </div>
  );
}
