import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import './DetailAplikasi.css';

function extensionOf(document) {
  return document.fileName?.split('.').pop()?.toLowerCase() || '';
}

export default function DetailAplikasi() {
  const { id } = useParams();
  const { token } = useAuth();
  const [aplikasi, setAplikasi] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [loading, setLoading] = useState(true);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [error, setError] = useState('');
  const [documentsError, setDocumentsError] = useState('');

  useEffect(() => {
    const muatDetail = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [applicationResponse, documentsResponse] = await Promise.all([
          fetch(`${API_URL}/api/aplikasi`, { headers }),
          fetch(`${API_URL}/api/aplikasi/${id}/dokumen`, { headers }),
        ]);
        const data = await applicationResponse.json();
        const documentsData = await documentsResponse.json();

        if (!documentsResponse.ok || !documentsData.success) {
          setDocumentsError(documentsData.message || 'Gagal memuat dokumen aplikasi.');
        } else {
          setDocuments(documentsData.documents);
        }

        if (!applicationResponse.ok || !data.success) {
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
        setDocumentsLoading(false);
      }
    };

    muatDetail();
  }, [id, token]);

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
          headers: { Authorization: 'Bearer ' + token },
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
        {documentsLoading ? (
          <div className="detail-dokumen-empty">Memuat dokumen...</div>
        ) : documentsError ? (
          <div className="detail-dokumen-empty error">{documentsError}</div>
        ) : documents.length === 0 ? (
          <div className="detail-dokumen-empty">Belum ada dokumen untuk aplikasi ini.</div>
        ) : (
          <ul className="detail-dokumen-list">
            {documents.map((document) => (
              <li className="detail-dokumen-item" key={document.id}>
                <div>
                  <strong>{document.name}</strong>
                  <small>{document.category} · {document.fileName}</small>
                </div>
                <button type="button" onClick={() => openPreview(document)}>
                  Lihat
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selectedDocument && (
        <div className="document-preview-backdrop" role="presentation" onClick={() => setSelectedDocument(null)}>
          <section
            className="document-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="document-preview-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="document-preview-header">
              <div>
                <h2 id="document-preview-title">{selectedDocument.name}</h2>
                <p>{selectedDocument.category} · {selectedDocument.fileName}</p>
              </div>
              <button type="button" onClick={() => setSelectedDocument(null)}>Tutup</button>
            </header>

            {previewLoading && <div className="document-preview-unavailable">Memuat pratinjau...</div>}
            {previewError && <div className="document-preview-unavailable">{previewError}</div>}
            {!previewLoading && !previewError && preview?.type === 'pdf' && (
              <iframe
                className="document-preview-frame"
                title={`Pratinjau ${selectedDocument.name}`}
                src={`${API_URL}/document-files/${selectedDocument.storedFileName}`}
              />
            )}
            {!previewLoading && !previewError && preview?.type === 'text' && (
              <pre className="document-preview-unavailable document-preview-text">{preview.value}</pre>
            )}
            {!previewLoading && !previewError && preview?.type === 'html' && (
              <div className="document-preview-unavailable document-preview-html" dangerouslySetInnerHTML={{ __html: preview.value }} />
            )}

            <a
              className="document-download-button"
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
