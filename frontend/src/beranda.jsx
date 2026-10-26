import DashboardLayout from './layout.jsx';

const activities = [
  [
    'Hendra Wijaya mencabut hak “Kelola semua aplikasi” untuk Sari Wulandari',
    'Baru saja',
  ],
  [
    'Hendra Wijaya memberi hak “Kelola semua aplikasi” untuk Sari Wulandari',
    '5 menit yang lalu',
  ],
  ['Dokumen “Rekap Anggaran Q3” menunggu review', '3 jam yang lalu'],
  ['Rina Kusuma mengunggah “ERD Database Absen Online”', '1 hari yang lalu'],
  ['Manual Guide Absen Online diperbarui ke v1.1', '2 minggu yang lalu'],
  ['Dokumen “Kebijakan Perjalanan Dinas” ditolak', '1 bulan yang lalu'],
];

const documentStats = [
  ['Total Dokumen', '0'],
  ['Dokumen Saya', '0'],
  ['Menunggu Persetujuan', '0'],
];

function PageHeader() {
  return (
    <header className="page-header">
      <div>
        <h1>
          Selamat Datang, <em>User</em>
        </h1>
        <p>Kelola dan temukan pengetahuan di lingkungan PPK Kemayoran</p>
      </div>
      <time>Selasa, 28 Februari 2026</time>
    </header>
  );
}

function DocumentStats() {
  return (
    <section className="stats" aria-label="Ringkasan dokumen">
      {documentStats.map(([label, count]) => (
        <article className="stat-card" key={label}>
          <span>{label}</span>
          <strong>{count}</strong>
        </article>
      ))}
    </section>
  );
}

function RecentActivities() {
  return (
    <section className="activity-card">
      <div className="activity-heading">
        <h2>Aktivitas Terbaru</h2>
        <button aria-label="Lihat semua aktivitas">Lihat semua</button>
      </div>

      <ul>
        {activities.map(([text, when]) => (
          <li key={text}>
            <span>{text}</span>
            <time>{when}</time>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Beranda({ onNavigate, onLogout }) {
  return (
    <DashboardLayout
      activeMenu="Beranda"
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      <PageHeader />
      <DocumentStats />
      <RecentActivities />

      <footer className="dashboard-footer">
        KMS PPK Kemayoran <span>•</span> Portal pengetahuan internal
      </footer>
    </DashboardLayout>
  );
}
