
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Search, FileText, FileSpreadsheet, FileType, File as FileIcon } from 'lucide-react';
import CategoryFilter from '../components/CategoryFilter';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import './DokumenSaya.css';
import { spreadsheetToPreviewHtml } from '../utils/spreadsheetPreview';
import { sanitizePreviewHtml } from '../utils/sanitizePreviewHtml';

const documentTabs = [
  'Semua',
  'Menunggu Persetujuan',
  'Disetujui',
  'Ditolak',
];

const tabStatuses = {
  Semua: null,
  'Menunggu Persetujuan': 'pending',
  Disetujui: 'approved',
  Ditolak: 'rejected',
};

const statusLabels = {
  pending: 'Menunggu Persetujuan',
  approved: 'Disetujui',
  rejected: 'Ditolak',
};

function formatDocumentDate(value) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Mengambil ekstensi dari nama file asli atau nama file penyimpanan.
function extensionOf(document) {
  const fileName = document.fileName || document.storedFileName || '';

  return fileName.split('.').pop()?.toLowerCase() || '';
}

// Menentukan ikon dan warna berdasarkan format dokumen.
function getDocumentFileInfo(document) {
  const extension = extensionOf(document);

  if (extension === 'pdf') {
    return {
      type: 'pdf',
      label: 'PDF',
      Icon: FileType,
    };
  }

  if (['doc', 'docx'].includes(extension)) {
    return {
      type: 'word',
      label: 'Word',
      Icon: FileText,
    };
  }

  if (['xls', 'xlsx'].includes(extension)) {
    return {
      type: 'excel',
      label: 'Excel',
      Icon: FileSpreadsheet,
    };
  }

  return {
    type: 'other',
    label: extension ? extension.toUpperCase() : 'FILE',
    Icon: FileIcon,
  };
}

export default function DokumenSaya() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Kategori');

  const [selectedDocument, setSelectedDocument] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [versions, setVersions] = useState([]);

  const [editDocument, setEditDocument] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    category: '',
    tags: '',
    description: '',
    publicAccess: false,
    isPublic: false,
  });
  const [editFile, setEditFile] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  // Mengatur tab awal berdasarkan parameter URL.
  useEffect(() => {
    setActiveTab(
      searchParams.get('status') === 'pending'
        ? 'Menunggu Persetujuan'
        : 'Semua',
    );
  }, [searchParams]);

  // Mengambil daftar dokumen milik pengguna.
  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const response = await fetch(`${API_URL}/api/dokumen`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || 'Gagal mengambil daftar dokumen.',
          );
        }

        setDocuments(data.documents);

        // Memperbarui indeks teks jika masih ada dokumen yang belum
        // memiliki extractedText.
        const needsFullTextIndex = data.documents.some((document) =>
          !String(document.extractedText || '').trim(),
        );

        if (needsFullTextIndex) {
          await fetch(`${API_URL}/api/dokumen/reindex`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          const refreshedResponse = await fetch(
            `${API_URL}/api/dokumen`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );

          const refreshedData = await refreshedResponse.json();

          if (refreshedResponse.ok && refreshedData.success) {
            setDocuments(refreshedData.documents);
          }
        }
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      loadDocuments();
    } else {
      setLoading(false);
    }
  }, [token]);

  // Membuka pratinjau dokumen dan mengambil riwayat versinya.
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
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const versionsData = await versionsResponse.json();

      if (!versionsResponse.ok || !versionsData.success) {
        throw new Error(
          versionsData.message || 'Riwayat versi gagal dimuat.',
        );
      }

      setVersions(versionsData.versions);

      const extension = extensionOf(document);

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
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || 'Dokumen tidak dapat dibaca.',
          );
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
        throw new Error(
          'Format file belum didukung untuk pratinjau.',
        );
      }
    } catch (requestError) {
      setPreviewError(
        requestError.message || 'File tidak dapat dipratinjau.',
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  // Membuka formulir edit dokumen.
  const openEdit = (document) => {
    setEditDocument(document);

    setEditForm({
      title: document.name || '',
      category: document.category || '',
      tags: (document.tags || []).join(', '),
      description: document.description || '',
      publicAccess: Boolean(document.publicAccess),
      isPublic: Boolean(document.isPublic),
    });

    setEditFile(null);
    setError('');
  };

  // Menyimpan perubahan dokumen.
  const saveEdit = async (event) => {
    event.preventDefault();

    setEditSaving(true);
    setError('');

    const body = new FormData();

    body.append('title', editForm.title);
    body.append('category', editForm.category);
    body.append('tags', editForm.tags);
    body.append('description', editForm.description);
    body.append('publicAccess', String(editForm.publicAccess));
    body.append('isPublic', String(editForm.isPublic));

    if (editFile) {
      body.append('file', editFile);
    }

    try {
      const response = await fetch(
        `${API_URL}/api/dokumen/${editDocument.id}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body,
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Dokumen gagal diperbarui.',
        );
      }

      setEditDocument(null);

      const refreshed = await fetch(`${API_URL}/api/dokumen`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const refreshedData = await refreshed.json();

      if (!refreshed.ok || !refreshedData.success) {
        throw new Error(
          refreshedData.message || 'Gagal memperbarui daftar dokumen.',
        );
      }

      setDocuments(refreshedData.documents);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setEditSaving(false);
    }
  };

  // Menghapus dokumen.
  const deleteDocument = async (document) => {
    if (!window.confirm(`Hapus dokumen "${document.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/dokumen/${document.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Dokumen gagal dihapus.',
        );
      }

      setDocuments((current) =>
        current.filter((item) => item.id !== document.id),
      );
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  // Menyamakan pencarian huruf besar/kecil dan karakter beraksen.
  const normalizeSearchText = (value) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('id-ID');

  const normalizedQuery = normalizeSearchText(searchQuery.trim());

  // Filter dokumen berdasarkan status, kategori, pencarian, dan tag.
  const visibleDocuments = documents.filter((document) => {
    const matchesStatus =
      tabStatuses[activeTab] === null ||
      document.status === tabStatuses[activeTab];

    const matchesCategory =
      selectedCategory === 'Kategori' ||
      document.category === selectedCategory;

    const searchableText = normalizeSearchText(
      `${document.name} ${document.category || ''} ${
        document.description || ''
      } ${(document.tags || []).join(' ')} ${
        document.extractedText || ''
      }`,
    );

    const matchesSearch = searchableText.includes(normalizedQuery);

    const matchesTag =
      !selectedTag || (document.tags || []).includes(selectedTag);

    return (
      matchesStatus &&
      matchesCategory &&
      matchesSearch &&
      matchesTag
    );
  });

  const noDocuments = documents.length === 0;

  const tanggal = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="dokumen-saya">
      <header className="page-header">
        <div>
          <h1>Dokumen Saya</h1>
          <p>
            Hanya Anda yang dapat mengedit atau menghapus dokumen ini.
          </p>
        </div>

        <time>{tanggal}</time>
      </header>

      <section
        className="documents-panel"
        aria-label="Daftar dokumen saya"
      >
        {/* PENCARIAN, FILTER KATEGORI, DAN UNGGAH */}
        <div className="document-toolbar">
          <label className="document-search">
            <span className="sr-only">Cari dokumen</span>

            <Search
              className="document-search-icon"
              size={19}
              strokeWidth={1.8}
              aria-hidden="true"
            />

            <input
              type="search"
              placeholder="Cari judul atau isi dokumen"
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(event.target.value)
              }
            />
          </label>

          <CategoryFilter
            value={selectedCategory}
            onChange={setSelectedCategory}
          />

          {user?.permissions?.includes('dokumen.unggah') && (
            <button
              className="upload-button"
              type="button"
              onClick={() => navigate('/dokumen/upload')}
            >
              Unggah
            </button>
          )}
        </div>

        {/* TAB STATUS DOKUMEN */}
        <div
          className="document-tabs"
          role="tablist"
          aria-label="Filter status dokumen"
        >
          {documentTabs.map((tab) => (
            <button
              key={tab}
              id={`document-tab-${tab}`}
              className={`document-tab ${
                activeTab === tab ? 'active' : ''
              }`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls="document-list"
              onClick={() => setActiveTab(tab)}
            >
              {activeTab === tab && (
                <motion.span
                  className="document-tab-highlight"
                  layoutId="document-tab-highlight"
                  transition={{
                    type: 'spring',
                    stiffness: 380,
                    damping: 30,
                  }}
                />
              )}

              <span className="document-tab-label">{tab}</span>
            </button>
          ))}
        </div>

        {/* FILTER TAG AKTIF */}
        {selectedTag && (
          <div className="document-tag-filter" role="status">
            Menampilkan{' '}
            <strong>{visibleDocuments.length}</strong> dokumen
            dengan tag <strong>{selectedTag}</strong>

            <button
              type="button"
              onClick={() => setSelectedTag('')}
            >
              Hapus filter
            </button>
          </div>
        )}

        {/* PANEL DAFTAR DOKUMEN */}
        <div
          className="document-list"
          id="document-list"
          role="tabpanel"
          aria-labelledby={`document-tab-${activeTab}`}
          tabIndex="0"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              className="document-list-content"
              initial={{
                opacity: 0,
                y: 9,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: -5,
              }}
              transition={{
                duration: 0.2,
                ease: 'easeOut',
              }}
            >
              {loading ? (
                <div className="document-empty-state">
                  <p>Memuat dokumen...</p>
                </div>
              ) : error ? (
                <div className="document-empty-state">
                  <h2>Dokumen gagal dimuat</h2>
                  <p>{error}</p>
                </div>
              ) : (
                <div className="document-table-scroll">
                  <table className="document-table">
                    <thead>
                      <tr>
                        <th scope="col">Judul Dokumen</th>
                        <th scope="col">Kategori</th>
                        <th scope="col">Tanggal</th>
                        <th scope="col">Status</th>
                        <th scope="col">Aksi</th>
                      </tr>
                    </thead>

                    <tbody>
                      {visibleDocuments.length === 0 ? (
                        <tr>
                          <td colSpan="5">
                            <div className="document-empty-state">
                              <h2>
                                {noDocuments
                                  ? 'Belum ada dokumen'
                                  : 'Dokumen tidak ditemukan'}
                              </h2>

                              <p>
                                {noDocuments
                                  ? 'Dokumen yang Anda unggah akan muncul di sini.'
                                  : 'Coba ubah kata kunci atau filter pencarian.'}
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        visibleDocuments.map((document) => {
                          const fileInfo =
                            getDocumentFileInfo(document);

                          const FileIconComponent = fileInfo.Icon;

                          return (
                            <tr key={document.id}>
                              <td>
                                <div className="document-title-cell">
                                  <span
                                    className={`document-file-icon ${fileInfo.type}`}
                                    title={`File ${fileInfo.label}`}
                                    aria-label={`File ${fileInfo.label}`}
                                  >
                                    <FileIconComponent
                                      size={22}
                                      strokeWidth={1.8}
                                    />
                                  </span>

                                  <span
                                    className="document-title-text"
                                    title={document.name}
                                  >
                                    {document.name}
                                  </span>
                                </div>
                              </td>

                              <td>
                                <div>
                                  {document.category || 'Lainnya'}
                                </div>

                                {document.tags?.length > 0 && (
                                  <div
                                    className={`document-tags ${
                                      document.tags.length === 1
                                        ? 'single'
                                        : 'multiple'
                                    }`}
                                  >
                                    {document.tags.map((tag) => (
                                      <button
                                        type="button"
                                        className={`document-tag ${
                                          selectedTag === tag
                                            ? 'active'
                                            : ''
                                        }`}
                                        key={tag}
                                        onClick={() =>
                                          setSelectedTag(
                                            selectedTag === tag
                                              ? ''
                                              : tag,
                                          )
                                        }
                                        title={`Tampilkan dokumen dengan tag ${tag}`}
                                      >
                                        {tag}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </td>

                              <td>
                                {formatDocumentDate(
                                  document.updatedAt,
                                )}
                              </td>

                              <td>
                                <span
                                  className={`document-status status-${document.status}`}
                                >
                                  {statusLabels[document.status] ||
                                    'Menunggu Persetujuan'}
                                </span>
                              </td>

                              <td className="document-actions">
                                <button
                                  className="view-action"
                                  type="button"
                                  onClick={() =>
                                    openPreview(document)
                                  }
                                >
                                  Lihat
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openEdit(document)}
                                >
                                  Edit
                                </button>

                                <button
                                  className="delete-action"
                                  type="button"
                                  onClick={() =>
                                    deleteDocument(document)
                                  }
                                >
                                  Hapus
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* MODAL PRATINJAU DOKUMEN */}
      <AnimatePresence>
        {selectedDocument && (
          <motion.div
            className="document-preview-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setSelectedDocument(null)}
          >
            <motion.section
              className="document-preview-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="document-preview-title"
              initial={{
                opacity: 0,
                y: 16,
                scale: 0.98,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: 10,
                scale: 0.98,
              }}
              transition={{
                duration: 0.2,
                ease: 'easeOut',
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <header>
                <div>
                  <h2 id="document-preview-title">
                    {selectedDocument.name}
                  </h2>

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
                <div className="document-preview-empty">
                  Memuat pratinjau...
                </div>
              )}

              {previewError && (
                <div className="document-preview-empty error">
                  {previewError}
                </div>
              )}

              {!previewLoading &&
                !previewError &&
                preview?.type === 'pdf' && (
                  <iframe
                    className="document-preview-frame"
                    title={`Pratinjau ${selectedDocument.name}`}
                    src={`${API_URL}/document-files/${encodeURIComponent(
                      selectedDocument.storedFileName,
                    )}?token=${encodeURIComponent(token)}`}
                  />
                )}

              {!previewLoading &&
                !previewError &&
                preview?.type === 'text' && (
                  <pre className="document-preview-text">
                    {preview.value}
                  </pre>
                )}

              {!previewLoading &&
                !previewError &&
                preview?.type === 'html' && (
                  <div
                    className="document-preview-html"
                    dangerouslySetInnerHTML={{
                      __html: sanitizePreviewHtml(preview.value),
                    }}
                  />
                )}

              <section className="document-version-history">
                <h3>Riwayat Versi</h3>

                {versions.length === 0 ? (
                  <p className="document-version-empty">
                    Belum ada riwayat versi.
                  </p>
                ) : (
                  versions.map((version) => (
                    <article key={version.id}>
                      <div>
                        <strong>
                          v{version.version} ·{' '}
                          {version.eventType === 'upload'
                            ? 'Dokumen pertama diunggah'
                            : 'Pembaruan dokumen'}
                        </strong>

                        <small>
                          Diunggah oleh {version.uploader}
                        </small>
                      </div>

                      <time>
                        {formatDocumentDate(version.createdAt)}
                      </time>
                    </article>
                  ))
                )}
              </section>

              <a
                className="document-download-button"
                href={`${API_URL}/document-files/${encodeURIComponent(
                  selectedDocument.storedFileName,
                )}?token=${encodeURIComponent(token)}`}
                download={selectedDocument.fileName}
              >
                Unduh File
              </a>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL EDIT DOKUMEN */}
      <AnimatePresence>
        {editDocument && (
          <motion.div
            className="document-preview-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setEditDocument(null)}
          >
            <motion.form
              className="document-edit-modal"
              onSubmit={saveEdit}
              initial={{
                opacity: 0,
                y: 16,
                scale: 0.98,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: 10,
                scale: 0.98,
              }}
              transition={{
                duration: 0.2,
                ease: 'easeOut',
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <h2>Edit Dokumen</h2>

              <label>
                Judul Dokumen
                <input
                  value={editForm.title}
                  onChange={(event) =>
                    setEditForm({
                      ...editForm,
                      title: event.target.value,
                    })
                  }
                  required
                />
              </label>

              <label>
                Kategori
                <CategoryFilter
                  value={editForm.category || 'Kategori'}
                  onChange={(category) =>
                    setEditForm({
                      ...editForm,
                      category,
                    })
                  }
                />
              </label>

              <label>
                Tag
                <input
                  value={editForm.tags}
                  onChange={(event) =>
                    setEditForm({
                      ...editForm,
                      tags: event.target.value,
                    })
                  }
                  placeholder="#keuangan, #pegawai"
                />

                <small className="upload-field-help">
                  Contoh: #keuangan atau #kepegawaian.
                </small>
              </label>

              <label>
                Deskripsi
                <textarea
                  value={editForm.description}
                  onChange={(event) =>
                    setEditForm({
                      ...editForm,
                      description: event.target.value,
                    })
                  }
                  rows="3"
                  required
                />
              </label>

              <label className="document-edit-checkbox">
                <input
                  type="checkbox"
                  checked={editForm.publicAccess}
                  onChange={(event) =>
                    setEditForm({
                      ...editForm,
                      publicAccess: event.target.checked,
                    })
                  }
                />

                <span>
                  Akses publik lintas divisi

                  <small className="upload-field-help">
                    Dokumen dapat dibaca pengguna lintas divisi
                    setelah disetujui.
                  </small>
                </span>
              </label>

              <label className="document-edit-checkbox">
                <input
                  type="checkbox"
                  disabled={
                    !user?.permissions?.includes(
                      'dokumen.publikasi',
                    )
                  }
                  checked={editForm.isPublic}
                  onChange={(event) =>
                    setEditForm({
                      ...editForm,
                      isPublic: event.target.checked,
                    })
                  }
                />

                <span>
                  Akses Publik tampil di halaman utama

                  <small className="upload-field-help">
                    Dokumen harus aman dibaca umum dan sudah final.
                  </small>
                </span>
              </label>

              <label>
                Ganti berkas (opsional)
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  onChange={(event) =>
                    setEditFile(event.target.files?.[0] || null)
                  }
                />
              </label>

              <div className="document-edit-actions">
                <button
                  type="button"
                  onClick={() => setEditDocument(null)}
                >
                  Batal
                </button>

                <button type="submit" disabled={editSaving}>
                  {editSaving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
