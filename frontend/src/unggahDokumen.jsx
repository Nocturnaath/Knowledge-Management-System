import { useRef, useState } from 'react';
import DashboardLayout from './layout.jsx';

const applicationCategories = [
  'Overview',
  'Business Process',
  'Application Architecture',
  'Data Model',
  'API & Integration',
  'Infrastructure & Development',
  'User Guide',
  'Administration Guide',
  'Troubleshooting',
  'Changelog',
];

const applications = [
  'IT SUPPORT',
  'ABSEN ONLINE',
  'C - MARK',
  'C - CLEO',
  'C - MANTAP',
  'ZIMBRA',
];

export default function UnggahDokumen({
  onNavigate,
  onLogout,
  onCancel,
  onSubmit,
}) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [application, setApplication] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [publicAccess, setPublicAccess] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  function handleFileChange(event) {
    const selectedFile = event.target.files?.[0] || null;

    if (selectedFile && selectedFile.size > 10 * 1024 * 1024) {
      setFile(null);
      setError('Ukuran file melebihi batas maksimum 10 MB.');
      event.target.value = '';
      return;
    }

    setError('');
    setFile(selectedFile);
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!file) {
      setError('Pilih file yang akan diunggah.');
      return;
    }

    const today = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    onSubmit({
      id: `${file.name}-${file.lastModified}-${Date.now()}`,
      name: title.trim(),
      fileName: file.name,
      category,
      application,
      description: description.trim(),
      status: needsApproval ? 'pending' : 'approved',
      needsApproval,
      publicAccess,
      updatedAt: today,
    });
  }

  return (
    <DashboardLayout
      activeMenu="Dokumen"
      onNavigate={onNavigate}
      onLogout={onLogout}
      pageClassName="upload-page-layout"
    >
      <header className="upload-page-header">
        <h1>Unggah Dokumen</h1>
        <button className="back-link" type="button" onClick={onCancel}>
          <span aria-hidden="true">←</span>
          Kembali
        </button>
      </header>

      <form className="upload-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="document-title">Judul Dokumen<span>*</span></label>
          <input
            id="document-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="document-category">Kategori<span>*</span></label>
          <select
            id="document-category"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setApplication('');
            }}
            required
          >
            <option value="" disabled>Pilih Kategori</option>
            <optgroup label="Dokumentasi Aplikasi">
              {applicationCategories.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </optgroup>
            <optgroup label="Informasi Umum">
              <option value="Notulensi">Notulensi</option>
              <option value="Memorandum">Memorandum</option>
              <option value="RAB">RAB</option>
              <option value="Evidence Harian">Evidence Harian</option>
              <option value="Manajemen Risiko SPI">Manajemen Risiko SPI</option>
            </optgroup>
          </select>
          <p className="field-help">
            Jika bukan kategori dokumentasi aplikasi, Anda tidak perlu mencantumkan
            nama aplikasinya. Cukup berikan jenis dokumen, misalnya{' '}
            <b>Memorandum</b> atau <b>Notulensi</b>.
          </p>
        </div>

        <div className="form-field">
          <label htmlFor="document-application">Aplikasi</label>
          <select
            id="document-application"
            value={application}
            onChange={(event) => setApplication(event.target.value)}
          >
            <option value="">Pilih Aplikasi</option>
            {applications.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="document-description">Deskripsi<span>*</span></label>
          <textarea
            id="document-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
            rows="3"
          />
        </div>

        <div className="file-picker-field">
          <input
            ref={fileInputRef}
            id="document-file"
            className="sr-only"
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileChange}
          />
          <button
            className="choose-file-button"
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            Pilih File
          </button>
          <span className="file-guidance">
            {file ? file.name : 'Satu berkas per unggahan (PDF/DOCX, maks. 10 MB)'}
          </span>
        </div>

        <div className="upload-options">
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={needsApproval}
              onChange={(event) => setNeedsApproval(event.target.checked)}
            />
            <span>Membutuhkan Persetujuan Atasan</span>
          </label>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={publicAccess}
              onChange={(event) => setPublicAccess(event.target.checked)}
            />
            <span>Flag akses publik (lintas divisi)</span>
          </label>
        </div>

        {error && <p className="upload-error" role="alert">{error}</p>}

        <div className="upload-form-actions">
          <button className="cancel-button" type="button" onClick={onCancel}>
            Batal
          </button>
          <button className="upload-button" type="submit">
            Unggah
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
}
