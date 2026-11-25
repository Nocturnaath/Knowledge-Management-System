
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Search,
  FileText,
  FileSpreadsheet,
  FileImage,
  Presentation,
  File as FileIcon,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import './PersetujuanDokumen.css';
import { spreadsheetToPreviewHtml } from '../utils/spreadsheetPreview';
import { sanitizePreviewHtml } from '../utils/sanitizePreviewHtml';

function formatDate(value) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function fileExtension(document) {
  return document.fileName?.split('.').pop()?.toLowerCase() || '';
}

// Ikon dokumen berdasarkan ekstensi file
function DocumentFileIcon({ document }) {
  const extension = fileExtension(document);

  if (['xls', 'xlsx', 'csv'].includes(extension)) {
    return (
      <FileSpreadsheet
        className="ps-file-icon ps-file-excel"
        size={20}
        strokeWidth={1.9}
        aria-label="File spreadsheet"
      />
    );
  }

  if (['ppt', 'pptx'].includes(extension)) {
    return (
      <Presentation
        className="ps-file-icon ps-file-presentation"
        size={20}
        strokeWidth={1.9}
        aria-label="File presentasi"
      />
    );
  }

  if (
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension)
  ) {
    return (
      <FileImage
        className="ps-file-icon ps-file-image"
        size={20}
        strokeWidth={1.9}
        aria-label="File gambar"
      />
    );
  }

  if (['pdf'].includes(extension)) {
    return (
      <FileText
        className="ps-file-icon ps-file-pdf"
        size={20}
        strokeWidth={1.9}
        aria-label="File PDF"
      />
    );
  }

  if (['doc', 'docx', 'txt', 'rtf'].includes(extension)) {
    return (
      <FileText
        className="ps-file-icon ps-file-word"
        size={20}
        strokeWidth={1.9}
        aria-label="File dokumen"
      />
    );
  }

  return (
    <FileIcon
      className="ps-file-icon ps-file-default"
      size={20}
      strokeWidth={1.9}
      aria-label="File dokumen"
    />
  );
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

  const [permissions, setPermissions] = useState({
    canReview: false,
    canApprove: false,
  });

  // Memuat daftar dokumen persetujuan
  const loadDocuments = async () => {
    try {
      const response = await fetch(`${API_URL}/api/dokumen/persetujuan`, {
        headers: {
          Authorization: 'Bearer ' + token,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Gagal memuat dokumen.');
      }

      setDocuments(data.documents || []);

      setPermissions(
        data.permissions || {
          canReview: false,
          canApprove: false,
        },
      );

      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadDocuments();
    } else {
      setLoading(false);
    }
  }, [token]);

  // Filter dokumen berdasarkan tab dan pencarian
  const visibleDocuments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return documents
      .filter((document) =>
        tab === 'menunggu'
          ? document.status === 'pending'
          : document.status !== 'pending',
      )
      .filter((document) =>
        `${document.name || ''} ${document.category || ''} ${
          document.description || ''
        } ${document.extractedText || ''}`
          .toLowerCase()
          .includes(query),
      );
  }, [documents, search, tab]);

  // Memproses persetujuan, penolakan, atau penerusan dokumen
  const processDocument = async (action) => {
    if (!selectedDocument) return;

    setSaving(true);
    setActionError('');

    try {
      const isForward = action === 'forwarded';

      const response = await fetch(
        `${API_URL}/api/dokumen/${selectedDocument.id}${
          isForward ? '/forward' : '/status'
        }`,
        {
          method: isForward ? 'POST' : 'PATCH',
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(
            isForward ? { note } : { status: action, note },
          ),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Gagal memproses dokumen.');
      }

      setSelectedDocument(null);
      setNote('');

      await loadDocuments();
    } catch (requestError) {
      setActionError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  // Membuka pratinjau dokumen
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
          `${API_URL}/api/dokumen/preview/${encodeURIComponent(
            document.storedFileName,
          )}`,
          {
            headers: {
              Authorization: 'Bearer ' + token,
            },
          },
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Dokumen tidak dapat dibaca.');
        }

        setPreview({
          type: 'text',
          value: data.text,
        });

        return;
      }

      const response = await fetch(
        `${API_URL}/document-files/${encodeURIComponent(
          document.storedFileName,
        )}?token=${encodeURIComponent(token)}`,
      );

      if (!response.ok) {
        throw new Error('File tidak dapat dibaca.');
      }

      const buffer = await response.arrayBuffer();

      if (extension === 'docx') {
        const mammoth = await import('mammoth');

        const result = await mammoth.convertToHtml({
          arrayBuffer: buffer,
        });

        setPreview({
          type: 'html',
          value: result.value,
        });
      } else if (extension === 'xls' || extension === 'xlsx') {
        const XLSX = await import('xlsx');

        const workbook = XLSX.read(buffer, {
          type: 'array',
        });

        const value = spreadsheetToPreviewHtml(workbook, XLSX);

        setPreview({
          type: 'html',
          value,
        });
      } else {
        throw new Error('Format file belum didukung untuk pratinjau.');
      }
    } catch (requestError) {
      setPreviewError(
        requestError.message || 'File tidak dapat dipratinjau.',
      );
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

  const jumlahMenunggu = documents.filter(
    (document) => document.status === 'pending',
  ).length;

  return (
    <div className="ps-page">
      {/* HEADER HALAMAN */}
      <div className="ps-head">
        <div>
          <h1>Persetujuan Dokumen</h1>

          <p className="ps-sub">
            Dokumen yang membutuhkan persetujuan akan muncul di sini.
          </p>
        </div>

        <div className="ps-tanggal">{tanggal}</div>
      </div>

      {/* SEARCH BAR */}
      <div className="ps-cari">
        <Search
          className="ps-search-icon"
          size={19}
          strokeWidth={1.8}
          aria-hidden="true"
        />

        <input
          type="search"
          placeholder="Cari judul atau isi dokumen"
          aria-label="Cari judul atau isi dokumen"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {/* TAB NAVIGASI */}
      <div
        className="ps-tab"
        role="tablist"
        aria-label="Section persetujuan dokumen"
      >
        <motion.button
          type="button"
          role="tab"
          aria-selected={tab === 'menunggu'}
          className={tab === 'menunggu' ? 'aktif' : ''}
          onClick={() => setTab('menunggu')}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
        >
          {tab === 'menunggu' && (
            <motion.span
              className="ps-tab-indicator"
              layoutId="ps-tab-indicator"
              transition={{
                type: 'spring',
                stiffness: 380,
                damping: 30,
              }}
            />
          )}

          <span className="ps-tab-label">
            Menunggu Persetujuan ({jumlahMenunggu})
          </span>
        </motion.button>

        <motion.button
          type="button"
          role="tab"
          aria-selected={tab === 'riwayat'}
          className={tab === 'riwayat' ? 'aktif' : ''}
          onClick={() => setTab('riwayat')}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
        >
          {tab === 'riwayat' && (
            <motion.span
              className="ps-tab-indicator"
              layoutId="ps-tab-indicator"
              transition={{
                type: 'spring',
                stiffness: 380,
                damping: 30,
              }}
            />
          )}

          <span className="ps-tab-label">
            Riwayat Persetujuan Dokumen
          </span>
        </motion.button>
      </div>

      {/* TABEL DOKUMEN */}
      <div className="ps-tabel">
        <div className="ps-baris ps-kepala">
          <span>Judul Dokumen</span>
          <span>Pengunggah</span>
          <span>Tanggal</span>
          <span>{tab === 'menunggu' ? 'Status' : 'Keputusan'}</span>
          <span>Aksi</span>
        </div>

        <div className="ps-tabel-scroll">
          {loading && (
            <div className="ps-kosong">
              Memuat dokumen...
            </div>
          )}

          {!loading && error && (
            <div className="ps-kosong error">
              {error}
            </div>
          )}

          {!loading && !error && (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={tab}
                className="ps-tab-content"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{
                  duration: 0.2,
                  ease: 'easeOut',
                }}
              >
                {visibleDocuments.length === 0 ? (
                  <div className="ps-kosong">
                    {tab === 'menunggu'
                      ? 'Tidak ada dokumen yang perlu di-review.'
                      : 'Belum ada riwayat persetujuan dokumen.'}
                  </div>
                ) : (
                  visibleDocuments.map((document) => (
                    <div className="ps-baris" key={document.id}>
                      {/* JUDUL DAN IKON FILE */}
                      <span className="ps-judul">
                        <DocumentFileIcon document={document} />

                        <span className="ps-judul-text">
                          {document.name || document.fileName || 'Dokumen tanpa judul'}
                        </span>
                      </span>

                      <span>{document.uploader || '-'}</span>

                      <span>{formatDate(document.createdAt)}</span>

                      <span className="ps-status-cell">
                        <span
                          className={`ps-badge ${
                            document.status === 'pending'
                              ? 'menunggu'
                              : document.status === 'approved'
                                ? 'disetujui'
                                : 'ditolak'
                          }`}
                        >
                          {document.status === 'pending'
                            ? 'Menunggu Persetujuan'
                            : document.status === 'approved'
                              ? 'Disetujui'
                              : 'Ditolak'}
                        </span>

                        {document.lastActor && (
                          <small className="ps-table-history">
                            oleh {document.lastActor}
                          </small>
                        )}
                      </span>

                      <button
                        type="button"
                        className="ps-aksi"
                        onClick={() => {
                          setActionError('');
                          setNote('');
                          setSelectedDocument(document);
                        }}
                      >
                        {tab === 'menunggu' ? 'Tinjau' : 'Detail'}
                      </button>
                    </div>
                  ))
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* MODAL TINJAUAN DOKUMEN */}
      {selectedDocument && (
        <div
          className="ps-review-backdrop"
          onClick={() => setSelectedDocument(null)}
        >
          <section
            className="ps-review-modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="ps-review-header">
              <div>
                <h2>{selectedDocument.name}</h2>

                <span
                  className={`ps-badge ${
                    selectedDocument.status === 'pending'
                      ? 'menunggu'
                      : selectedDocument.status === 'approved'
                        ? 'disetujui'
                        : 'ditolak'
                  }`}
                >
                  {selectedDocument.status === 'pending'
                    ? 'Menunggu Persetujuan'
                    : selectedDocument.status === 'approved'
                      ? 'Disetujui'
                      : 'Ditolak'}
                </span>

                {selectedDocument.lastActor && (
                  <small className="ps-review-history">
                    Tindakan terakhir:{' '}
                    {selectedDocument.lastAction === 'forwarded'
                      ? 'diteruskan'
                      : selectedDocument.lastAction}{' '}
                    oleh {selectedDocument.lastActor}
                  </small>
                )}
              </div>

              <button
                type="button"
                className="ps-review-close"
                onClick={() => setSelectedDocument(null)}
              >
                ← Kembali
              </button>
            </header>

            <div className="ps-review-content">
              <div className="ps-review-details">
                <p>
                  <span>Pengunggah</span>
                  <strong>{selectedDocument.uploader || '-'}</strong>
                </p>

                <p>
                  <span>Divisi</span>
                  <strong>{selectedDocument.division || '-'}</strong>
                </p>

                <p>
                  <span>Kategori</span>
                  <strong>{selectedDocument.category || '-'}</strong>
                </p>

                <p>
                  <span>Aplikasi</span>
                  <strong>{selectedDocument.application || '-'}</strong>
                </p>

                <p>
                  <span>Tanggal Unggah</span>
                  <strong>{formatDate(selectedDocument.createdAt)}</strong>
                </p>

                <p>
                  <span>Deskripsi</span>
                  <strong>{selectedDocument.description || '-'}</strong>
                </p>

                <button
                  type="button"
                  className="ps-view-file"
                  onClick={() => openPreview(selectedDocument)}
                >
                  Lihat Dokumen
                </button>
              </div>

              <div className="ps-review-action">
                <label htmlFor="approval-note">
                  Catatan (Opsional)
                </label>

                <textarea
                  id="approval-note"
                  placeholder="Berikan catatan atau masukan Anda..."
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />

                {actionError && (
                  <p className="ps-action-error">
                    {actionError}
                  </p>
                )}

                {selectedDocument.status === 'pending' &&
                  (permissions.canReview || permissions.canApprove) && (
                    <div className="ps-review-buttons">
                      {permissions.canReview && (
                        <button
                          type="button"
                          className="ps-reject"
                          disabled={saving}
                          onClick={() => processDocument('rejected')}
                        >
                          {saving ? 'Memproses...' : 'Tolak'}
                        </button>
                      )}

                      {permissions.canApprove ? (
                        <button
                          type="button"
                          className="ps-approve"
                          disabled={saving}
                          onClick={() => processDocument('approved')}
                        >
                          {saving ? 'Memproses...' : 'Setujui'}
                        </button>
                      ) : (
                        permissions.canReview && (
                          <button
                            type="button"
                            className="ps-forward"
                            disabled={saving}
                            onClick={() => processDocument('forwarded')}
                          >
                            {saving
                              ? 'Memproses...'
                              : 'Teruskan ke Super Admin'}
                          </button>
                        )
                      )}
                    </div>
                  )}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* MODAL PREVIEW FILE */}
      {previewDocument && (
        <div
          className="ps-file-preview-backdrop"
          onClick={() => setPreviewDocument(null)}
        >
          <section
            className="ps-file-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ps-file-preview-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="ps-file-preview-header">
              <div>
                <h2 id="ps-file-preview-title">
                  {previewDocument.name}
                </h2>

                <p>{previewDocument.fileName}</p>
              </div>

              <button
                type="button"
                onClick={() => setPreviewDocument(null)}
              >
                Tutup
              </button>
            </header>

            {previewLoading && (
              <div className="ps-file-preview-message">
                Memuat pratinjau...
              </div>
            )}

            {previewError && (
              <div className="ps-file-preview-message error">
                {previewError}
              </div>
            )}

            {!previewLoading &&
              !previewError &&
              preview?.type === 'pdf' && (
                <iframe
                  className="ps-file-preview-frame"
                  title={`Pratinjau ${previewDocument.name}`}
                  src={`${API_URL}/document-files/${encodeURIComponent(
                    previewDocument.storedFileName,
                  )}?token=${encodeURIComponent(token)}`}
                />
              )}

            {!previewLoading &&
              !previewError &&
              preview?.type === 'text' && (
                <pre className="ps-file-preview-text">
                  {preview.value}
                </pre>
              )}

            {!previewLoading &&
              !previewError &&
              preview?.type === 'html' && (
                <div
                  className="ps-file-preview-html"
                  dangerouslySetInnerHTML={{
                    __html: sanitizePreviewHtml(preview.value),
                  }}
                />
              )}

            <a
              className="ps-file-download"
              href={`${API_URL}/document-files/${encodeURIComponent(
                previewDocument.storedFileName,
              )}?token=${encodeURIComponent(token)}`}
              download={previewDocument.fileName}
            >
              Unduh File
            </a>
          </section>
        </div>
      )}
    </div>
  );
}
