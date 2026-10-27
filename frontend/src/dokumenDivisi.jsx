import { useState } from 'react';
import DashboardLayout from './layout.jsx';
import CategoryFilter from './categoryFilter.jsx';

const statusLabels = {
  approved: 'Disetujui',
  pending: 'Menunggu',
  rejected: 'Ditolak',
};

export default function DokumenDivisi({
  documents = [],
  onNavigate,
  onLogout,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Kategori');

  const normalizedQuery = searchQuery.trim().toLocaleLowerCase('id-ID');
  const visibleDocuments = documents.filter((document) => {
    const matchesTitle = document.title
      .toLocaleLowerCase('id-ID')
      .includes(normalizedQuery);
    const matchesCategory =
      selectedCategory === 'Kategori' ||
      document.category === selectedCategory;

    return matchesTitle && matchesCategory;
  });

  return (
    <DashboardLayout
      activeMenu="Dokumen Divisi"
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      <header className="page-header division-page-header">
        <div>
          <h1>Dokumen Divisi</h1>
          <p>Dokumen divisi termasuk dokumen milik Anda. Klik dokumen untuk melihat.</p>
        </div>
        <time>Selasa, 28 Februari 2026</time>
      </header>

      <div className="division-toolbar">
        <label className="division-search">
          <span className="search-icon" aria-hidden="true" />
          <span className="sr-only">Cari Judul Dokumen</span>
          <input
            type="search"
            placeholder="Cari Judul Dokumen"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </label>
        <CategoryFilter
          value={selectedCategory}
          onChange={setSelectedCategory}
        />
      </div>

      <section className="division-table-card" aria-label="Daftar dokumen divisi">
        <div className="division-table-scroll" tabIndex="0" aria-label="Tabel dokumen divisi, dapat digulir">
          <table className="division-table">
            <thead>
              <tr>
                <th scope="col">Judul Dokumen</th>
                <th scope="col">Pengunggah</th>
                <th scope="col">Kategori</th>
                <th scope="col">Tanggal</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleDocuments.length === 0 ? (
                <tr>
                  <td className="division-empty" colSpan="5">
                    {documents.length === 0
                      ? 'Belum ada dokumen divisi.'
                      : 'Dokumen tidak ditemukan.'}
                  </td>
                </tr>
              ) : (
                visibleDocuments.map((document) => (
                  <tr key={document.id}>
                    <td>{document.title}</td>
                    <td>{document.uploader || 'Nama user'}</td>
                    <td>{document.category}</td>
                    <td>{document.date || document.updatedAt}</td>
                    <td>
                      <span className={`division-status status-${document.status}`}>
                        {statusLabels[document.status] || 'Disetujui'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardLayout>
  );
}
