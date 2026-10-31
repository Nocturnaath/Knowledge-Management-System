import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CategoryFilter from '../components/CategoryFilter';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import './DokumenSaya.css';

const documentTabs = ['Semua', 'Menunggu Persetujuan', 'Disetujui', 'Ditolak'];

const tabStatuses = {
  Semua: null,
  'Menunggu Persetujuan': 'pending',
  Disetujui: 'approved',
  Ditolak: 'rejected'
};

const statusLabels = {
  pending: 'Menunggu Persetujuan',
  approved: 'Disetujui',
  rejected: 'Ditolak'
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

function extensionOf(document) {
  return document.fileName?.split('.').pop()?.toLowerCase() || '';
}

// documents = daftar dokumen: { id, name, category, status, updatedAt }
// Sementara kosong; nanti diisi dari server.
export default function DokumenSaya() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Kategori');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [versions, setVersions] = useState([]);
  const [editDocument, setEditDocument] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', category: '', description: '', publicAccess: false });
  const [editFile, setEditFile] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    setActiveTab(searchParams.get('status') === 'pending' ? 'Menunggu Persetujuan' : 'Semua');
  }, [searchParams]);

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const response = await fetch(`${API_URL}/api/dokumen`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Gagal mengambil daftar dokumen.');
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

  const openPreview = async (document) => {
    setSelectedDocument(document);
    setPreview(null);
    setVersions([]);
    setPreviewError('');
    setPreviewLoading(true);

    try {
      const versionsResponse = await fetch(`${API_URL}/api/dokumen/${document.id}/versions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const versionsData = await versionsResponse.json();
      if (!versionsResponse.ok || !versionsData.success) throw new Error(versionsData.message);
      setVersions(versionsData.versions);

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
        const value = workbook.SheetNames.map((sheetName) => (
          `<h3>${sheetName}</h3>${XLSX.utils.sheet_to_html(workbook.Sheets[sheetName])}`
        )).join('');
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

  const openEdit = (document) => {
    setEditDocument(document);
    setEditForm({
      title: document.name || '',
      category: document.category || '',
      description: document.description || '',
      publicAccess: Boolean(document.publicAccess),
    });
    setEditFile(null);
    setError('');
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    setEditSaving(true);
    setError('');
    const body = new FormData();
    body.append('title', editForm.title);
    body.append('category', editForm.category);
    body.append('description', editForm.description);
    body.append('publicAccess', String(editForm.publicAccess));
    if (editFile) body.append('file', editFile);

    try {
      const response = await fetch(`${API_URL}/api/dokumen/${editDocument.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Dokumen gagal diperbarui.');
      setEditDocument(null);
      const refreshed = await fetch(`${API_URL}/api/dokumen`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const refreshedData = await refreshed.json();
      if (!refreshed.ok || !refreshedData.success) throw new Error(refreshedData.message);
      setDocuments(refreshedData.documents);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setEditSaving(false);
    }
  };

  const deleteDocument = async (document) => {
    if (!window.confirm(`Hapus dokumen "${document.name}"?`)) return;
    try {
      const response = await fetch(`${API_URL}/api/dokumen/${document.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Dokumen gagal dihapus.');
      setDocuments((current) => current.filter((item) => item.id !== document.id));
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const normalizedQuery = searchQuery.trim().toLocaleLowerCase('id-ID');
  const visibleDocuments = documents.filter((document) => {
    const matchesStatus =
      tabStatuses[activeTab] === null || document.status === tabStatuses[activeTab];
    const matchesCategory =
      selectedCategory === 'Kategori' || document.category === selectedCategory;
    const searchableText = `${document.name} ${document.category || ''}`.toLocaleLowerCase('id-ID');
    const matchesSearch = searchableText.includes(normalizedQuery);

    return matchesStatus && matchesCategory && matchesSearch;
  });

  const noDocuments = documents.length === 0;

  const tanggal = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="dokumen-saya">
      <header className="page-header">
        <div>
          <h1>Dokumen Saya</h1>
          <p>Hanya Anda yang dapat mengedit atau menghapus dokumen ini.</p>
        </div>
        <time>{tanggal}</time>
      </header>

      <section className="documents-panel" aria-label="Daftar dokumen saya">
        <div className="document-toolbar">
          <label className="document-search">
            <span className="sr-only">Cari dokumen</span>
            <input
              type="search"
              placeholder="Cari Judul Dokumen"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>

          <CategoryFilter value={selectedCategory} onChange={setSelectedCategory} />

          <button className="upload-button" type="button" onClick={() => navigate('/dokumen/upload')}>
            Unggah
          </button>
        </div>

        <div className="document-tabs" role="tablist" aria-label="Filter status dokumen">
          {documentTabs.map((tab) => (
            <button
              key={tab}
              id={`document-tab-${tab}`}
              className={`document-tab ${activeTab === tab ? 'active' : ''}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls="document-list"
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div
          className="document-list"
          id="document-list"
          role="tabpanel"
          aria-labelledby={`document-tab-${activeTab}`}
          tabIndex="0"
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
          ) : visibleDocuments.length === 0 ? (
            <div className="document-empty-state">
              <span className="empty-document-icon" aria-hidden="true">▤</span>
              <h2>{noDocuments ? 'Belum ada dokumen' : 'Dokumen tidak ditemukan'}</h2>
              <p>
                {noDocuments
                  ? `Dokumen dengan status “${activeTab}” akan muncul di sini.`
                  : 'Coba ubah kata pencarian atau filter kategori.'}
              </p>
            </div>
          ) : (
            <div className="document-table-scroll">
              <table className="document-table">
                <thead>
                  <tr>
                    <th>Judul Dokumen</th>
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
                      <td>{document.category || 'Lainnya'}</td>
                      <td>{formatDocumentDate(document.updatedAt)}</td>
                      <td>
                        <span className={`document-status status-${document.status}`}>
                          {statusLabels[document.status] || 'Menunggu Persetujuan'}
                        </span>
                      </td>
                      <td className="document-actions">
                        <button type="button" onClick={() => openPreview(document)}>Lihat</button>
                        <a href={`${API_URL}/document-files/${encodeURIComponent(document.storedFileName)}`} download={document.fileName}>Unduh</a>
                        <button type="button" onClick={() => openEdit(document)}>Edit</button>
                        <button className="delete-action" type="button" onClick={() => deleteDocument(document)}>Hapus</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {selectedDocument && (
        <div className="document-preview-backdrop" onClick={() => setSelectedDocument(null)}>
          <section className="document-preview-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header>
              <div>
                <h2>{selectedDocument.name}</h2>
                <p>{selectedDocument.fileName}</p>
              </div>
              <button type="button" onClick={() => setSelectedDocument(null)}>Tutup</button>
            </header>
            {previewLoading && <div className="document-preview-empty">Memuat pratinjau...</div>}
            {previewError && <div className="document-preview-empty error">{previewError}</div>}
            {!previewLoading && !previewError && preview?.type === 'pdf' && (
              <iframe className="document-preview-frame" title={`Pratinjau ${selectedDocument.name}`} src={`${API_URL}/document-files/${encodeURIComponent(selectedDocument.storedFileName)}`} />
            )}

            {!previewLoading && !previewError && preview?.type === 'text' && (
              <pre className="document-preview-text">{preview.value}</pre>
            )}
            {!previewLoading && !previewError && preview?.type === 'html' && (
              <div className="document-preview-html" dangerouslySetInnerHTML={{ __html: preview.value }} />
            )}
            <section className="document-version-history">
              <h3>Riwayat Versi</h3>
              {versions.map((version) => (
                <article key={version.id}>
                  <div>
                    <strong>v{version.version} · {version.eventType === 'upload' ? 'Dokumen pertama diunggah' : 'Pembaruan dokumen'}</strong>
                    <small>Diunggah oleh {version.uploader}</small>
                  </div>
                  <time>{formatDocumentDate(version.createdAt)}</time>
                </article>
              ))}
            </section>
          </section>
        </div>
      )}

      {editDocument && (
        <div className="document-preview-backdrop" onClick={() => setEditDocument(null)}>
          <form className="document-edit-modal" onSubmit={saveEdit} onClick={(event) => event.stopPropagation()}>
            <h2>Edit Dokumen</h2>
            <label>
              Judul Dokumen
              <input value={editForm.title} onChange={(event) => setEditForm({ ...editForm, title: event.target.value })} required />
            </label>
            <label>
              Kategori
              <CategoryFilter value={editForm.category || 'Kategori'} onChange={(category) => setEditForm({ ...editForm, category })} />
            </label>
            <label>
              Deskripsi
              <textarea value={editForm.description} onChange={(event) => setEditForm({ ...editForm, description: event.target.value })} rows="3" required />
            </label>
            <label className="document-edit-checkbox">
              <input type="checkbox" checked={editForm.publicAccess} onChange={(event) => setEditForm({ ...editForm, publicAccess: event.target.checked })} />
              Flag akses ke publik
            </label>
            <label>
              Ganti berkas (opsional)
              <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" onChange={(event) => setEditFile(event.target.files?.[0] || null)} />
            </label>
            <div className="document-edit-actions">
              <button type="button" onClick={() => setEditDocument(null)}>Batal</button>
              <button type="submit" disabled={editSaving}>{editSaving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </form>
        </div>
      )}

      <footer className="dashboard-footer">
        C-BIJAK <span>•</span> Portal pengetahuan internal
      </footer>
    </div>
  );
}