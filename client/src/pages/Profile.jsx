import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import './Profile.css';

export default function Profile() {
  const { user, token, updateUserPhoto } = useAuth();
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Bersihkan alamat pratinjau agar tidak memenuhi memori
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  if (!user) {
    return (
      <div className="profile-page">
        <p>Silakan login terlebih dahulu.</p>
      </div>
    );
  }

  // Memilih foto: tampilkan pratinjau (belum disimpan)
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    setError('');
    setMessage('');
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('File harus berupa gambar.');
      e.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Ukuran foto maksimal 2 MB.');
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  // Tombol "Simpan Perubahan": kirim foto ke server
  const handleSimpan = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('foto', selectedFile);

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`${API_URL}/api/auth/profile/photo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || 'Gagal mengunggah foto.');
        return;
      }

      updateUserPhoto(data.photoUrl);
      setMessage('Foto profil berhasil diperbarui!');
      setSelectedFile(null);
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError('Tidak dapat terhubung ke server.');
    } finally {
      setLoading(false);
    }
  };

  // Urutan foto: pratinjau (baru dipilih) -> foto dari server -> huruf awal nama
  const photoSrc = preview || (user.photoUrl ? `${API_URL}${user.photoUrl}` : null);
  const initial = user.nama?.trim()?.charAt(0)?.toUpperCase() || 'U';

  return (
    <main className="profile-page">
      <h1>Profil Saya</h1>
      <p className="sub">
        Hanya bisa mengubah foto. Informasi lainnya adalah informasi tetap.
      </p>

      {message && <div className="alert-success" role="status">{message}</div>}
      {error && <div className="alert-error" role="alert">{error}</div>}

      <section className="profile-box">
        {/* Kolom kiri: foto profil */}
        <div className="pf-left">
          <div className="pf-avatar">
            {photoSrc ? <img src={photoSrc} alt="Foto profil pengguna" /> : <span>{initial}</span>}
          </div>

          <input
            ref={fileInputRef}
            className="pf-file-input"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            aria-label="Pilih foto profil"
          />
          <button
            type="button"
            className="btn-foto"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            Ubah Foto
          </button>
        </div>

        {/* Kolom kanan: data profil (tidak bisa diedit) */}
        <div className="pf-right">
          <div className="pf-field">
            <label htmlFor="profile-nama">Nama Lengkap*</label>
            <input id="profile-nama" type="text" value={user.nama || '-'} disabled readOnly />
          </div>
          <div className="pf-field">
            <label htmlFor="profile-divisi">Divisi*</label>
            <input id="profile-divisi" type="text" value={user.divisi || '-'} disabled readOnly />
          </div>
          <div className="pf-field">
            <label htmlFor="profile-jabatan">Jabatan*</label>
            <input id="profile-jabatan" type="text" value={user.jabatan || '-'} disabled readOnly />
          </div>

          <button
            type="button"
            className="btn-simpan"
            onClick={handleSimpan}
            disabled={!selectedFile || loading}
          >
            {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </section>
    </main>
  );
}