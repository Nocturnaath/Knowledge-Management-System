import { useCallback, useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import './KelolaKategori.css';

export default function KelolaKategori() {
  const { token } = useAuth();
  const [categories, setCategories] = useState([]);
  const [rumpun, setRumpun] = useState([]);
  const [name, setName] = useState('');
  const [newNames, setNewNames] = useState({ aplikasi: '', informasi: '' });
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [targetCategoryId, setTargetCategoryId] = useState('');
  const [rumpunNames, setRumpunNames] = useState({ new: '', editing: null, value: '' });

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/kategori`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Gagal memuat kategori.');
      setCategories(data.categories);
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Tidak dapat terhubung ke server.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const loadRumpun = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/aplikasi/rumpun/manage`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Gagal memuat rumpun aplikasi.');
      setRumpun(data.rumpun);
    } catch (requestError) {
      setError(requestError.message || 'Tidak dapat memuat rumpun aplikasi.');
    }
  }, [token]);

  useEffect(() => {
    loadRumpun();
  }, [loadRumpun]);

  const resetForm = () => {
    setName('');
    setEditing(null);
  };

  const startEditingCategory = (category) => {
    // Simpan objek kategori agar form PUT mengetahui ID yang akan diubah.
    setEditing(category);
    setName(category.name);
    setMessage('');
    setError('');
  };

  const saveCategory = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(
        `${API_URL}/api/kategori${editing ? `/${editing.id}` : ''}`,
        {
          method: editing ? 'PUT' : 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name }),
        },
      );
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Gagal menyimpan kategori.');
      resetForm();
      setMessage(editing ? 'Kategori berhasil diperbarui.' : 'Kategori berhasil ditambahkan.');
      loadCategories();
    } catch (requestError) {
      setError(requestError.message || 'Tidak dapat terhubung ke server.');
    } finally {
      setSaving(false);
    }
  };

  const requestDeleteCategory = (category) => {
    setError('');
    setMessage('');
    if (Number(category.documentCount) > 0) {
      setDeleteTarget(category);
      setTargetCategoryId('');
      return;
    }
    if (window.confirm(`Hapus kategori "${category.name}"?`)) deleteCategory(category);
  };

  const deleteCategory = async (category, destinationId = null) => {
    setError('');
    setMessage('');
    try {
      const response = await fetch(`${API_URL}/api/kategori/${category.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetCategoryId: destinationId ? Number(destinationId) : undefined }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Gagal menghapus kategori.');
      setMessage('Kategori berhasil dihapus.');
      setDeleteTarget(null);
      setTargetCategoryId('');
      loadCategories();
    } catch (requestError) {
      setError(requestError.message || 'Tidak dapat terhubung ke server.');
    }
  };

  const confirmDeleteCategory = () => {
    if (!targetCategoryId) {
      setError('Pilih kategori tujuan terlebih dahulu.');
      return;
    }
    deleteCategory(deleteTarget, targetCategoryId);
  };

  const addCategory = async (event, group) => {
    event.preventDefault();
    const categoryName = newNames[group].trim();
    if (!categoryName) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(`${API_URL}/api/kategori`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: categoryName,
          categoryType: group,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Gagal menambah kategori.');
      setNewNames((current) => ({ ...current, [group]: '' }));
      setMessage('Kategori berhasil ditambahkan.');
      loadCategories();
    } catch (requestError) {
      setError(requestError.message || 'Tidak dapat terhubung ke server.');
    } finally {
      setSaving(false);
    }
  };

  const saveRumpun = async (event) => {
    event.preventDefault();
    const editingRumpun = rumpunNames.editing;
    const nameValue = (editingRumpun ? rumpunNames.value : rumpunNames.new).trim();
    if (!nameValue) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(
        `${API_URL}/api/aplikasi/rumpun${editingRumpun ? `/${editingRumpun.id}` : ''}`,
        {
          method: editingRumpun ? 'PUT' : 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: nameValue }),
        },
      );
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Gagal menyimpan rumpun.');
      setRumpunNames({ new: '', editing: null, value: '' });
      setMessage(editingRumpun ? 'Rumpun berhasil diperbarui.' : 'Rumpun berhasil ditambahkan.');
      loadRumpun();
    } catch (requestError) {
      setError(requestError.message || 'Tidak dapat terhubung ke server.');
    } finally {
      setSaving(false);
    }
  };

  const deleteRumpun = async (item) => {
    if (!window.confirm(`Hapus rumpun "${item.name}"?`)) return;
    setError('');
    setMessage('');
    try {
      const response = await fetch(`${API_URL}/api/aplikasi/rumpun/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Gagal menghapus rumpun.');
      setMessage('Rumpun berhasil dihapus.');
      loadRumpun();
    } catch (requestError) {
      setError(requestError.message || 'Tidak dapat terhubung ke server.');
    }
  };

  const applicationCategories = categories.filter((category) => category.categoryType === 'aplikasi');
  const informationCategories = categories.filter((category) => category.categoryType === 'informasi');

  const renderPanel = (title, items, group) => (
    <section className="kategori-panel">
      <h2>{title}</h2>
      <div className="kategori-panel-list">
        {items.map((category) => (
          <div className="kategori-panel-row" key={category.id}>
            <div>
              <strong>{category.name}</strong>
              <small>{category.documentCount} Dokumen</small>
            </div>
            <div className="kategori-actions">
              <button type="button" onClick={(event) => { event.preventDefault(); startEditingCategory(category); }}>Ubah</button>
              <button type="button" onClick={() => requestDeleteCategory(category)}>Hapus</button>
            </div>
          </div>
        ))}
        {!loading && items.length === 0 && <p className="kategori-empty">Belum ada kategori.</p>}
      </div>
      <form className="kategori-inline-form" onSubmit={(event) => addCategory(event, group)}>
        <input
          value={newNames[group]}
          onChange={(event) => setNewNames((current) => ({ ...current, [group]: event.target.value }))}
          placeholder="Tambah baru....."
          maxLength={100}
          aria-label={`Tambah kategori ${title}`}
        />
        <button type="submit" disabled={saving}>Tambah</button>
      </form>
    </section>
  );

  return (
    <div className="kategori-page">
      <header className="kategori-head">
        <div>
          <h1>Kelola Kategori</h1>
          <p>Tambah, ubah, dan hapus kategori dokumen.</p>
        </div>
        <time>{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</time>
      </header>

      {editing && (
        <form className="kategori-edit-form" onSubmit={saveCategory}>
          <label htmlFor="kategori-name">Mengubah: {editing.name}</label>
          <div className="kategori-form-row">
            <input id="kategori-name" value={name} maxLength={100} onChange={(event) => setName(event.target.value)} required />
            <button type="submit" disabled={saving}><Pencil size={17} />Simpan</button>
            <button type="button" className="kategori-cancel" onClick={resetForm}>Batal</button>
          </div>
        </form>
      )}

      <div className="kategori-info">Mengubah nama otomatis memperbarui dokumen terkait. Kategori yang masih dipakai akan meminta kategori tujuan sebelum dihapus.</div>
      {message && <div className="kategori-alert sukses" role="status">{message}</div>}
      {error && <div className="kategori-alert error" role="alert">{error}</div>}

      {loading && <div className="kategori-loading">Memuat kategori...</div>}
      <div className="kategori-grid">
        {renderPanel('Jenis Dokumen Aplikasi', applicationCategories, 'aplikasi')}
        {renderPanel('Kategori Informasi Umum', informationCategories, 'informasi')}
      </div>
      <section className="kategori-panel rumpun-panel">
        <h2>Rumpun Aplikasi</h2>
        <div className="kategori-panel-list">
          {rumpun.map((item) => (
            <div className="kategori-panel-row" key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <small>{item.applicationCount} Aplikasi</small>
              </div>
              <div className="kategori-actions">
                <button type="button" onClick={() => setRumpunNames({ new: '', editing: item, value: item.name })}>Ubah</button>
                <button type="button" onClick={() => deleteRumpun(item)}>Hapus</button>
              </div>
            </div>
          ))}
          {!loading && rumpun.length === 0 && <p className="kategori-empty">Belum ada rumpun.</p>}
        </div>
        <form className="kategori-inline-form" onSubmit={saveRumpun}>
          <input
            value={rumpunNames.editing ? rumpunNames.value : rumpunNames.new}
            onChange={(event) => setRumpunNames((current) => (
              current.editing
                ? { ...current, value: event.target.value }
                : { ...current, new: event.target.value }
            ))}
            placeholder={rumpunNames.editing ? 'Ubah nama rumpun.....' : 'Tambah baru.....'}
            maxLength={150}
            aria-label="Tambah rumpun aplikasi"
          />
          <button type="submit" disabled={saving}>{rumpunNames.editing ? 'Simpan' : 'Tambah'}</button>
          {rumpunNames.editing && (
            <button type="button" className="rumpun-cancel" onClick={() => setRumpunNames({ new: '', editing: null, value: '' })}>Batal</button>
          )}
        </form>
      </section>
      {deleteTarget && (
        <div className="kategori-dialog-backdrop" onClick={() => setDeleteTarget(null)}>
          <section className="kategori-dialog" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h2>Pindahkan lalu hapus kategori</h2>
            <p><strong>{deleteTarget.documentCount} dokumen akan dipindah</strong> dari <strong>{deleteTarget.name}</strong>. Dokumen dan riwayat versi tetap utuh.</p>
            <label htmlFor="kategori-target">Pindahkan ke kategori</label>
            <select id="kategori-target" value={targetCategoryId} onChange={(event) => setTargetCategoryId(event.target.value)}>
              <option value="">Pilih kategori tujuan</option>
              {categories
                .filter((category) => category.id !== deleteTarget.id && category.categoryType === deleteTarget.categoryType)
                .map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            <div className="kategori-dialog-actions">
              <button type="button" className="kategori-cancel" onClick={() => setDeleteTarget(null)}>Batal</button>
              <button type="button" onClick={confirmDeleteCategory} disabled={saving}>Pindahkan lalu hapus</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
