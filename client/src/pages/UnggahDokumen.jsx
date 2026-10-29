import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import './UnggahDokumen.css';

const categories = [
  'Overview',
  'Business Process',
  'Application Architecture',
  'Data Model',
  'API & Integration',
  'Infrastructure & Deployment',
  'User Guide',
  'Administration Guide',
  'Troubleshooting',
  'Changelog',
  'Notulensi',
  'Memorandum',
  'RAB',
  'Evidence Harian',
  'Manajemen Risiko SPI',
];

function ApplicationSelect({ applications, value, onChange }) {
  const [open, setOpen] = useState(false);
  const selectedApplication = applications.find((application) => application.nama === value);

  return (
    <div className="application-select">
      <button
        type="button"
        className="application-select-trigger"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {selectedApplication?.nama || 'Pilih aplikasi'}
        <span aria-hidden="true">⌄</span>
      </button>
      {open && (
        <div className="application-select-menu" role="listbox">
          <button
            type="button"
            className={!value ? 'selected' : ''}
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
          >
            Pilih aplikasi
          </button>
          {applications.map((application) => (
            <button
              type="button"
              role="option"
              aria-selected={application.nama === value}
              className={application.nama === value ? 'selected' : ''}
              key={application.id}
              onClick={() => {
                onChange(application.nama);
                setOpen(false);
              }}
            >
              {application.nama}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function UnggahDokumen() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    title: '',
    category: '',
    application: '',
    description: '',
    needsApproval: false,
    publicAccess: false,
  });
  const [file, setFile] = useState(null);
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState('');
  const [applicationsError, setApplicationsError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadApplications = async () => {
      try {
        const response = await fetch(`${API_URL}/api/aplikasi/options`, {
          headers: { Authorization: 'Bearer ' + token },
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Gagal memuat daftar aplikasi.');
        }
        setApplications(data.applications);
      } catch (requestError) {
        setApplicationsError(requestError.message);
      }
    };

    loadApplications();
  }, [token]);

  const updateField = (event) => {
    const { name, value, checked, type } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0] || null;
    if (selectedFile && selectedFile.size > 50 * 1024 * 1024) {
      setFile(null);
      setError('Ukuran file maksimal 50 MB.');
      event.target.value = '';
      return;
    }
    setError('');
    setFile(selectedFile);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file) {
      setError('Pilih file yang akan diunggah.');
      return;
    }

    setSubmitting(true);
    setError('');
    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => body.append(key, value));
    body.append('file', file);

    try {
      const response = await fetch(`${API_URL}/api/dokumen`, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
        body,
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Dokumen gagal diunggah.');
      }
      navigate('/dokumen');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="upload-page">
      <header className="upload-page-header">
        <div>
          <h1>Unggah Dokumen</h1>
          <p>Tambahkan dokumen ke basis pengetahuan C-BIJAK.</p>
        </div>
        <button type="button" className="upload-back-button" onClick={() => navigate('/dokumen')}>
          Kembali
        </button>
      </header>

      <form className="upload-form" onSubmit={handleSubmit}>
        <label>
          Judul Dokumen *
          <input name="title" value={form.title} onChange={updateField} required />
        </label>
        <label>
          Kategori *
          <select name="category" value={form.category} onChange={updateField} required>
            <option value="">Pilih kategori</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <label>
          Aplikasi
          <ApplicationSelect
            applications={applications}
            value={form.application}
            onChange={(application) => setForm((current) => ({ ...current, application }))}
          />
          {applicationsError && <small className="upload-field-error">{applicationsError}</small>}
        </label>
        <label>
          Deskripsi *
          <textarea name="description" value={form.description} onChange={updateField} rows="3" required />
        </label>
        <div className="upload-file-field">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx"
            onChange={handleFileChange}
            required
          />
          <span>{file ? file.name : 'PDF, DOC, DOCX, XLS, XLSX (maks. 50 MB)'}</span>
        </div>
        <label className="upload-checkbox">
          <input type="checkbox" name="needsApproval" checked={form.needsApproval} onChange={updateField} />
          Membutuhkan Persetujuan Atasan
        </label>
        <label className="upload-checkbox">
          <input type="checkbox" name="publicAccess" checked={form.publicAccess} onChange={updateField} />
          Akses publik lintas divisi
        </label>
        {error && <p className="upload-error" role="alert">{error}</p>}
        <div className="upload-actions">
          <button type="button" onClick={() => navigate('/dokumen')}>Batal</button>
          <button type="submit" disabled={submitting}>{submitting ? 'Mengunggah...' : 'Unggah'}</button>
        </div>
      </form>
    </div>
  );
}
