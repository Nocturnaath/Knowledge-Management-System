
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import './UnggahDokumen.css';

const defaultCategories = [
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

/* Menutup dropdown ketika user mengeklik area di luar
   atau menekan tombol Escape. */
function useDropdownClose(dropdownRef, open, setOpen) {
  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [dropdownRef, open, setOpen]);
}

/* Dropdown kategori */
function CategorySelect({ categories, value, onChange }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useDropdownClose(dropdownRef, open, setOpen);

  return (
    <div className="category-select" ref={dropdownRef}>
      <button
        type="button"
        className={`category-select-trigger ${
          open ? 'is-open' : ''
        }`}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
      >
        <span className={value ? '' : 'category-placeholder'}>
          {value || 'Pilih kategori'}
        </span>

        <span className="category-select-arrow" aria-hidden="true">
          ⌄
        </span>
      </button>

      {open && (
        <div className="category-select-menu" role="listbox">
          <button
            type="button"
            role="option"
            aria-selected={!value}
            className={!value ? 'selected' : ''}
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
          >
            Pilih kategori
          </button>

          {categories.map((category) => (
            <button
              type="button"
              role="option"
              aria-selected={category === value}
              className={category === value ? 'selected' : ''}
              key={category}
              onClick={() => {
                onChange(category);
                setOpen(false);
              }}
            >
              {category}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* Dropdown aplikasi */
function ApplicationSelect({ applications, value, onChange }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useDropdownClose(dropdownRef, open, setOpen);

  const selectedApplication = applications.find(
    (application) => application.nama === value
  );

  return (
    <div className="application-select" ref={dropdownRef}>
      <button
        type="button"
        className={`application-select-trigger ${
          open ? 'is-open' : ''
        }`}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
      >
        <span className={value ? '' : 'application-placeholder'}>
          {selectedApplication?.nama || 'Pilih aplikasi'}
        </span>

        <span className="application-select-arrow" aria-hidden="true">
          ⌄
        </span>
      </button>

      {open && (
        <div className="application-select-menu" role="listbox">
          <button
            type="button"
            role="option"
            aria-selected={!value}
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
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    title: '',
    category: '',
    application: '',
    tags: '',
    description: '',
    needsApproval: false,
    publicAccess: false,
    isPublic: false,
  });

  const [file, setFile] = useState(null);
  const [applications, setApplications] = useState([]);
  const [categories, setCategories] = useState(defaultCategories);
  const [error, setError] = useState('');
  const [applicationsError, setApplicationsError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch(`${API_URL}/api/kategori`, {
          headers: { Authorization: 'Bearer ' + token },
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Gagal memuat daftar kategori.');
        }

        setCategories(data.categories.map((category) => category.name));
      } catch (requestError) {
        setError(requestError.message);
      }
    };

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

        const applicationId = searchParams.get('applicationId');
        const applicationName = searchParams.get('applicationName');

        const selectedApplication = data.applications.find((application) =>
          applicationId
            ? String(application.id) === String(applicationId)
            : application.nama === applicationName
        );

        if (selectedApplication) {
          setForm((current) => ({
            ...current,
            application: selectedApplication.nama,
          }));
        }
      } catch (requestError) {
        setApplicationsError(requestError.message);
      }
    };

    loadCategories();
    loadApplications();
  }, [token, searchParams]);

  const updateField = (event) => {
    const { name, value, checked, type } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
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

    if (!form.category) {
      setError('Silakan pilih kategori dokumen.');
      return;
    }

    if (!file) {
      setError('Pilih file yang akan diunggah.');
      return;
    }

    setSubmitting(true);
    setError('');

    const body = new FormData();

    Object.entries(form).forEach(([key, value]) => {
      body.append(key, value);
    });

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
        <div className="upload-heading">
          <h1>Unggah Dokumen</h1>
          <p>Tambahkan dokumen ke basis pengetahuan C-BIJAK.</p>
        </div>

        <button
          type="button"
          className="upload-back-button"
          onClick={() => navigate('/dokumen')}
        >
          <span className="upload-back-arrow" aria-hidden="true">←</span>
          Kembali
        </button>
      </header>

      <form className="upload-form" onSubmit={handleSubmit}>
        <label className="upload-field">
          <span>
            Judul Dokumen <span className="required-mark">*</span>
          </span>

          <input
            name="title"
            value={form.title}
            onChange={updateField}
            placeholder="Masukkan judul dokumen"
            required
          />
        </label>

        {/* Dropdown kategori */}
        <div className="upload-field">
          <span className="upload-field-label">
            Kategori <span className="required-mark">*</span>
          </span>

          <CategorySelect
            categories={categories}
            value={form.category}
            onChange={(category) =>
              setForm((current) => ({ ...current, category }))
            }
          />
        </div>

        {/* Dropdown aplikasi */}
        <div className="upload-field">
          <span className="upload-field-label">Aplikasi</span>

          <ApplicationSelect
            applications={applications}
            value={form.application}
            onChange={(application) =>
              setForm((current) => ({ ...current, application }))
            }
          />

          {applicationsError && (
            <small className="upload-field-error">
              {applicationsError}
            </small>
          )}
        </div>

        <label className="upload-field">
          <span>
            Deskripsi <span className="required-mark">*</span>
          </span>

          <textarea
            name="description"
            value={form.description}
            onChange={updateField}
            rows="3"
            placeholder="Tuliskan deskripsi singkat dokumen..."
            required
          />
        </label>

        <label className="upload-field">
          <span>Tag</span>

          <input
            name="tags"
            value={form.tags}
            onChange={updateField}
            placeholder="#keuangan, #pegawai"
            aria-describedby="tag-help"
          />

          <small id="tag-help" className="upload-field-help">
            Gunakan tag untuk memudahkan pencarian, misalnya #keuangan atau
            #kepegawaian.
          </small>
        </label>

        <div className="upload-file-field">
          <label className="upload-field-label" htmlFor="upload-document-file">
            File Dokumen <span className="required-mark">*</span>
          </label>

          <input
            ref={fileInputRef}
            id="upload-document-file"
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx"
            onChange={handleFileChange}
            required
          />

          <small className="upload-field-help">
            {file
              ? `File dipilih: ${file.name}`
              : 'Format PDF, DOC, DOCX, XLS, XLSX. Maksimal 50 MB.'}
          </small>
        </div>

        <div className="upload-access-options">
          <p className="upload-access-title">Pengaturan Akses</p>

          <label className="upload-checkbox">
            <input
              type="checkbox"
              name="needsApproval"
              checked={form.needsApproval}
              onChange={updateField}
            />
            <span>Membutuhkan Persetujuan Atasan</span>
          </label>

          <label className="upload-checkbox">
            <input
              type="checkbox"
              name="publicAccess"
              checked={form.publicAccess}
              onChange={updateField}
            />
            <span>
              Akses publik lintas divisi
              <small className="upload-field-help">
                Dokumen dapat dibaca pengguna lintas divisi setelah disetujui.
              </small>
            </span>
          </label>

          <label
            className={`upload-checkbox ${
              !user?.permissions?.includes('dokumen.publikasi')
                ? 'is-disabled'
                : ''
            }`}
          >
            <input
              type="checkbox"
              name="isPublic"
              disabled={!user?.permissions?.includes('dokumen.publikasi')}
              checked={form.isPublic}
              onChange={updateField}
            />
            <span>
              Akses publik tampil di halaman utama
              <small className="upload-field-help">
                Hanya gunakan untuk manual guide, troubleshooting, atau
                pengumuman yang aman dibaca umum.
              </small>

              {!user?.permissions?.includes('dokumen.publikasi') && (
                <small className="upload-permission-note">
                  Anda tidak memiliki izin untuk mengaktifkan akses ini.
                </small>
              )}
            </span>
          </label>
        </div>

        {error && (
          <p className="upload-error" role="alert">
            {error}
          </p>
        )}

        <div className="upload-actions">
          <button
            type="button"
            className="upload-cancel-button"
            onClick={() => navigate('/dokumen')}
          >
            Batal
          </button>

          <button
            type="submit"
            className="upload-submit-button"
            disabled={submitting}
          >
            {submitting ? 'Mengunggah...' : 'Unggah'}
          </button>
        </div>
      </form>
    </div>
  );
}
