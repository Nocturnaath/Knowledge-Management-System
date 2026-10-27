import { useState } from 'react';
import DashboardLayout from './layout.jsx';
import CategoryFilter from './categoryFilter.jsx';

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

export default function DokumenSaya({
  documents = [],
  onNavigate,
  onLogout,
  onUploadClick,
}) {
  const [activeTab, setActiveTab] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Kategori');

  const normalizedQuery = searchQuery.trim().toLocaleLowerCase('id-ID');
  const visibleDocuments = documents.filter((document) => {
    const matchesStatus =
      tabStatuses[activeTab] === null ||
      document.status === tabStatuses[activeTab];
    const matchesCategory =
      selectedCategory === 'Kategori' ||
      document.category === selectedCategory;
    const searchableText = `${document.name} ${document.category || ''}`
      .toLocaleLowerCase('id-ID');
    const matchesSearch = searchableText.includes(normalizedQuery);

    return matchesStatus && matchesCategory && matchesSearch;
  });

  const noDocuments = documents.length === 0;

  return (
    <DashboardLayout
      activeMenu="Dokumen"
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      <header className="page-header document-page-header">
        <div>
          <h1>Dokumen Saya</h1>
          <p>Kelola dokumen yang Anda unggah dan pantau status persetujuannya.</p>
        </div>
        <time>Selasa, 28 Februari 2026</time>
      </header>

      <section className="documents-panel" aria-label="Daftar dokumen saya">
        <div className="document-toolbar">
          <label className="document-search">
            <span className="search-icon" aria-hidden="true" />
            <span className="sr-only">Cari dokumen</span>
            <input
              type="search"
              placeholder="Cari dokumen"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>

          <CategoryFilter
            value={selectedCategory}
            onChange={setSelectedCategory}
          />

          <button
            className="upload-button"
            type="button"
            onClick={onUploadClick}
          >
            <span aria-hidden="true">＋</span>
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
          {visibleDocuments.length === 0 ? (
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
        KMS PPK Kemayoran <span>•</span> Portal pengetahuan internal
      </footer>
    </DashboardLayout>
  );
}
