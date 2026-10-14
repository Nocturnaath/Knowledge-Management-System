import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Profile.css';

export default function Profile() {
  const { user, token, updateUserPhoto, logout } = useAuth();
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user) {
    return <div className="profile-container">Silakan login terlebih dahulu.</div>;
  }

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
    setError('');
    setMessage('');
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Pilih foto terlebih dahulu.');
      return;
    }

    const formData = new FormData();
    formData.append('foto', selectedFile);

    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/auth/profile/photo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();

      if (data.success) {
        setMessage('Foto profil berhasil diperbarui!');
        updateUserPhoto(data.photoUrl);
        setSelectedFile(null);
      } else {
        setError(data.message || 'Gagal mengunggah foto.');
      }
    } catch (err) {
      setError('Terjadi kesalahan pada server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-card">
        <h2>Profil Pengguna C-BIJAK</h2>
        
        {message && <div className="alert-success">{message}</div>}
        {error && <div className="alert-error">{error}</div>}

        <div className="profile-info-section">
          <div className="profile-avatar-box">
            {user.photoUrl ? (
              <img src={`http://localhost:5000${user.photoUrl}`} alt="Avatar" className="avatar-img" />
            ) : (
              <div className="avatar-placeholder">{user.nama ? user.nama.charAt(0) : 'U'}</div>
            )}
          </div>

          <div className="profile-details">
            <p><strong>Nama Lengkap:</strong> {user.nama}</p>
            <p><strong>Username:</strong> {user.username}</p>
            <p><strong>Email:</strong> {user.email || '-'}</p>
            <p><strong>Divisi:</strong> {user.divisi}</p>
            <p><strong>Role Sistem:</strong> <span className="badge-role">{user.role}</span></p>
          </div>
        </div>

        <form onSubmit={handleUpload} className="upload-form">
          <label>Ganti Foto Profil (Maks. 2MB)</label>
          <input type="file" accept="image/*" onChange={handleFileChange} />
          <button type="submit" className="btn-upload" disabled={loading}>
            {loading ? 'Mengunggah...' : 'Unggah Foto Baru'}
          </button>
        </form>

        <button onClick={logout} className="btn-logout">Keluar (Logout)</button>
      </div>
    </div>
  );
}