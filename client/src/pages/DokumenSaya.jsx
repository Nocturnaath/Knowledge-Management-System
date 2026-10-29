import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

// documents = daftar dokumen: { id, name, category, status, updatedAt }
// Sementara kosong; nanti diisi dari server.
export default function DokumenSaya() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Kategori');

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
          <p>Kelola dokumen yang Anda unggah dan pantau status persetujuannya.</p>
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
            <ul className="document-items">
              {visibleDocuments.map((document) => (
                <li className="document-item" key={document.id}>
                  <span className="document-file-icon" aria-hidden="true">▤</span>
                  <span className="document-file-details">
                    <b>{document.name}</b>
                    <small>
                      {document.category || 'Lainnya'}
                      {document.updatedAt ? ` · ${document.updatedAt}` : ''}
                    </small>
                  </span>
                  <span className={`document-status status-${document.status}`}>
                    {statusLabels[document.status] || 'Menunggu Persetujuan'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <footer className="dashboard-footer">
        C-BIJAK <span>•</span> Portal pengetahuan internal
      </footer>
    </div>
  );
}