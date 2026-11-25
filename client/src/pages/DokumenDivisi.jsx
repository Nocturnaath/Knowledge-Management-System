
import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  FileText,
  FileSpreadsheet,
  FileImage,
  Presentation,
  File,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import CategoryFilter from '../components/CategoryFilter';
import './DokumenDivisi.css';
import { spreadsheetToPreviewHtml } from '../utils/spreadsheetPreview';
import { sanitizePreviewHtml } from '../utils/sanitizePreviewHtml';

const statusLabels = {
  approved: 'Disetujui',
  pending: 'Menunggu',
  rejected: 'Ditolak',
};

// Mengambil ekstensi file.
function extensionOf(document) {
  return document.fileName?.split('.').pop()?.toLowerCase() || '';
}

// Menentukan ikon berdasarkan jenis file.
function DocumentFileIcon({ document }) {
  const extension = extensionOf(document);

  if (['xls', 'xlsx', 'csv'].includes(extension)) {
    return (
      <FileSpreadsheet
        className="division-file-icon spreadsheet"
        size={21}
        aria-label="File spreadsheet"
      />
    );
  }

  if (['ppt', 'pptx'].includes(extension)) {
    return (
      <Presentation
        className="division-file-icon presentation"
        size={21}
        aria-label="File presentasi"
      />
    );
  }

  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
    return (
      <FileImage
        className="division-file-icon image"
        size={21}
        aria-label="File gambar"
      />
    );
  }

  if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(extension)) {
    return (
      <FileText
        className={`division-file-icon ${
          extension === 'pdf' ? 'pdf' : 'document'
        }`}
        size={21}
        aria-label={`File ${extension.toUpperCase()}`}
      />
    );
  }

  return (
    <File
      className="division-file-icon default"
      size={21}
      aria-label="File"
    />
  );
}

export default function DokumenDivisi() {
  const { token } = useAuth();

  const [documents, setDocuments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Kategori');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [preview, setPreview] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewError, setPreviewError] = useState('');

  const tanggal = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

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

        setDocuments(Array.isArray(data.documents) ? data.documents : []);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
  }, [token]);

  // Filter dokumen berdasarkan kategori dan kata kunci pencarian.
  const visibleDocuments = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('id-ID');

    return documents.filter((document) =>
      (selectedCategory === 'Kategori' ||
        document.category === selectedCategory) &&
      `${document.name} ${document.category || ''} ${
        document.description || ''
      } ${document.extractedText || ''}`
        .toLocaleLowerCase('id-ID')
        .includes(query)
    );
  }, [documents, searchQuery, selectedCategory]);

  // Membuka pratinjau dan mengambil riwayat versi dokumen.
  const openPreview = async (document) => {
    setSelectedDocument(document);
    setPreview(null);
    setVersions([]);
    setPreviewError('');
    setPreviewLoading(true);

    try {
      const versionsResponse = await fetch(
        `${API_URL}/api/dokumen/${document.id}/versions`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const versionsData = await versionsResponse.json();

      if (!versionsResponse.ok || !versionsData.success) {
        throw new Error(versionsData.message);
      }

      setVersions(versionsData.versions);

      const extension = extensionOf(document);

      // Pratinjau PDF.
      if (extension === 'pdf') {
        setPreview({ type: 'pdf' });
        return;
      }

      // Pratinjau DOC.
      if (extension === 'doc') {
        const response = await fetch(
          `${API_URL}/api/dokumen/preview/${encodeURIComponent(
            document.storedFileName
          )}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message);
        }

        setPreview({ type: 'text', value: data.text });
        return;
      }

      // Mengambil file untuk format DOCX, XLS, dan XLSX.
      const response = await fetch(
        `${API_URL}/document-files/${encodeURIComponent(
          document.storedFileName
        )}?token=${encodeURIComponent(token)}`
      );

      if (!response.ok) {
        throw new Error('File tidak dapat dibaca.');
      }

      const buffer = await response.arrayBuffer();

      // Pratinjau DOCX.
      if (extension === 'docx') {
        const mammoth = await import('mammoth');
        const result = await mammoth.convertToHtml({
          arrayBuffer: buffer,
        });

        setPreview({ type: 'html', value: result.value });
      }

      // Pratinjau XLS dan XLSX.
      else if (extension === 'xls' || extension === 'xlsx') {
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(buffer, { type: 'array' });
        const value = spreadsheetToPreviewHtml(workbook, XLSX);

        setPreview({ type: 'html', value });
      } else {
        throw new Error('Format file belum didukung untuk pratinjau.');
      }
    } catch (previewRequestError) {
      setPreviewError(
        previewRequestError.message || 'File tidak dapat dipratinjau.'
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="division-page">
      {/* Header halaman */}
      <header className="division-page-header">
        <div>
          <h1>Dokumen Divisi</h1>
          <p>Dokumen divisi termasuk dokumen milik Anda.</p>
        </div>

        <time>{tanggal}</time>
      </header>

      {/* Pencarian dan filter kategori */}
      <div className="division-toolbar">
        <label className="division-search">
          <span className="sr-only">Cari dokumen divisi</span>

          <Search
            className="division-search-icon"
            size={20}
            aria-hidden="true"
          />

          <input
            type="search"
            placeholder="Cari judul atau isi dokumen"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            aria-label="Cari judul atau isi dokumen"
          />
        </label>

        <CategoryFilter
          value={selectedCategory}
          onChange={setSelectedCategory}
        />
      </div>

      {/* Panel daftar dokumen */}
      <section
        className="division-table-card"
        aria-label="Daftar dokumen divisi"
      >
        {loading ? (
          <p className="division-message">Memuat dokumen...</p>
        ) : error ? (
          <p className="division-message error">{error}</p>
        ) : (
          <div className="division-table-scroll">
            <table className="division-table">
              <thead>
                <tr>
                  <th scope="col">Judul Dokumen</th>
                  <th scope="col">Pengunggah</th>
                  <th scope="col">Kategori</th>
                  <th scope="col">Tanggal</th>
                  <th scope="col">Status</th>
                  <th scope="col">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {visibleDocuments.length === 0 ? (
                  <tr>
                    <td className="division-empty" colSpan="6">
                      {documents.length === 0
                        ? 'Belum ada dokumen divisi.'
                        : 'Dokumen tidak ditemukan.'}
                    </td>
                  </tr>
                ) : (
                  visibleDocuments.map((document) => (
                    <tr key={document.id}>
                      <td className="division-document-name">
                        <div className="division-document-info">
                          <DocumentFileIcon document={document} />

                          <span title={document.name}>
                            {document.name}
                          </span>
                        </div>
                      </td>

                      <td>{document.uploader}</td>

                      <td>{document.category}</td>

                      <td>
                        {new Date(document.createdAt).toLocaleDateString(
                          'id-ID'
                        )}
                      </td>

                      <td>
                        <span
                          className={`division-status status-${document.status}`}
                        >
                          {statusLabels[document.status] || document.status}
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          onClick={() => openPreview(document)}
                        >
                          Lihat
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal pratinjau dokumen */}
      {selectedDocument && (
        <div
          className="division-preview-backdrop"
          onClick={() => setSelectedDocument(null)}
        >
          <section
            className="division-preview-modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <h2>{selectedDocument.name}</h2>
                <p>{selectedDocument.fileName}</p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDocument(null)}
              >
                Tutup
              </button>
            </header>

            {previewLoading && (
              <div className="division-preview-empty">
                Memuat pratinjau...
              </div>
            )}

            {previewError && (
              <div className="division-preview-empty error">
                {previewError}
              </div>
            )}

            {!previewLoading &&
              !previewError &&
              preview?.type === 'pdf' && (
                <iframe
                  className="division-preview-frame"
                  title={`Pratinjau ${selectedDocument.name}`}
                  src={`${API_URL}/document-files/${selectedDocument.storedFileName}?token=${encodeURIComponent(
                    token
                  )}`}
                />
              )}

            {!previewLoading &&
              !previewError &&
              preview?.type === 'text' && (
                <pre className="division-preview-text">
                  {preview.value}
                </pre>
              )}

            {!previewLoading &&
              !previewError &&
              preview?.type === 'html' && (
                <div
                  className="division-preview-html"
                  dangerouslySetInnerHTML={{
                    __html: sanitizePreviewHtml(preview.value),
                  }}
                />
              )}

            {/* Riwayat versi */}
            <section className="division-version-history">
              <h3>Riwayat Versi</h3>

              {versions.map((version) => (
                <article key={version.id}>
                  <div>
                    <strong>
                      v{version.version} ·{' '}
                      {version.eventType === 'upload'
                        ? 'Dokumen pertama diunggah'
                        : 'Pembaruan dokumen'}
                    </strong>

                    <small>Diunggah oleh {version.uploader}</small>
                  </div>

                  <time>
                    {new Date(version.createdAt).toLocaleDateString('id-ID')}
                  </time>
                </article>
              ))}
            </section>

            {/* Unduh dokumen */}
            <a
              className="division-download"
              href={`${API_URL}/document-files/${selectedDocument.storedFileName}?token=${encodeURIComponent(
                token
              )}`}
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
