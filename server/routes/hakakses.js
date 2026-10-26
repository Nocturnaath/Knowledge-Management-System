const express = require('express');
const db = require('../config/db');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

// Urutan kolom izin di tabel (sesuai desain)
const URUTAN = [
  'unggah_dokumen',
  'kelola_kategori',
  'kelola_aplikasi',
  'akses_dokumen_sensitif',
  'review_dokumen',
  'acc_final',
  'kelola_hak_akses'
];

// Peran sistem (sama dengan ENUM users.role)
const PERAN = [
  { key: 'staff_divisi', nama: 'Staff Divisi' },
  { key: 'staff_it', nama: 'Staff IT' },
  { key: 'admin', nama: 'Admin' },
  { key: 'super_admin', nama: 'Super Admin' }
];

// Semua rute di sini hanya untuk Super Admin
router.use(verifyToken, (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Hanya Super Admin yang dapat mengatur hak akses.' });
  }
  next();
});

// GET /api/hak-akses -> daftar izin, izin default per peran, izin efektif per pengguna
router.get('/', async (req, res) => {
  try {
    const [izin] = await db.query('SELECT perm_key AS `key`, label FROM permissions');
    izin.sort((a, b) => URUTAN.indexOf(a.key) - URUTAN.indexOf(b.key));

    const [rolePerm] = await db.query('SELECT role, perm_key FROM role_permissions');
    const [override] = await db.query('SELECT user_id, perm_key, allowed FROM user_permission_overrides');
    const [users] = await db.query(`
      SELECT u.id, u.nama_lengkap AS nama, u.jabatan, u.role, d.nama_divisi AS divisi
      FROM users u
      LEFT JOIN divisi d ON d.id = u.divisi_id
      ORDER BY u.id
    `);

    const peran = PERAN.map((p) => ({
      ...p,
      izin: rolePerm.filter((r) => r.role === p.key).map((r) => r.perm_key)
    }));

    // Izin efektif pengguna = izin default perannya, lalu ditimpa pengecualian (override)
    const pengguna = users.map((u) => {
      const set = new Set(rolePerm.filter((r) => r.role === u.role).map((r) => r.perm_key));
      override
        .filter((o) => o.user_id === u.id)
        .forEach((o) => (o.allowed ? set.add(o.perm_key) : set.delete(o.perm_key)));
      return { ...u, izin: [...set] };
    });

    res.json({ success: true, izin, peran, pengguna });
  } catch (error) {
    console.error('Error memuat hak akses:', error);
    res.status(500).json({ success: false, message: 'Gagal memuat hak akses.' });
  }
});

// PUT /api/hak-akses/peran/:role  body: { perm_key, allowed }
router.put('/peran/:role', async (req, res) => {
  const { role } = req.params;
  const { perm_key, allowed } = req.body;

  if (role === 'super_admin' || !PERAN.some((p) => p.key === role)) {
    return res.status(400).json({ success: false, message: 'Peran ini tidak dapat diubah.' });
  }
  if (!URUTAN.includes(perm_key)) {
    return res.status(400).json({ success: false, message: 'Izin tidak dikenal.' });
  }

  try {
    if (allowed) {
      await db.query('INSERT IGNORE INTO role_permissions (role, perm_key) VALUES (?, ?)', [role, perm_key]);
    } else {
      await db.query('DELETE FROM role_permissions WHERE role = ? AND perm_key = ?', [role, perm_key]);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error mengubah izin peran:', error);
    res.status(500).json({ success: false, message: 'Gagal menyimpan perubahan.' });
  }
});

// PUT /api/hak-akses/pengguna/:id  body: { perm_key, allowed }
// Jika nilainya sama dengan default peran, pengecualian dihapus; jika berbeda, disimpan.
router.put('/pengguna/:id', async (req, res) => {
  const { id } = req.params;
  const { perm_key, allowed } = req.body;

  if (!URUTAN.includes(perm_key)) {
    return res.status(400).json({ success: false, message: 'Izin tidak dikenal.' });
  }

  try {
    const [users] = await db.query('SELECT role FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    }
    if (users[0].role === 'super_admin') {
      return res.status(400).json({ success: false, message: 'Hak akses Super Admin tidak dapat diubah.' });
    }

    const [dasar] = await db.query(
      'SELECT 1 FROM role_permissions WHERE role = ? AND perm_key = ?',
      [users[0].role, perm_key]
    );
    const adaDiDefault = dasar.length > 0;

    if (Boolean(allowed) === adaDiDefault) {
      await db.query('DELETE FROM user_permission_overrides WHERE user_id = ? AND perm_key = ?', [id, perm_key]);
    } else {
      await db.query(
        `INSERT INTO user_permission_overrides (user_id, perm_key, allowed) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE allowed = VALUES(allowed)`,
        [id, perm_key, allowed ? 1 : 0]
      );
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error mengubah izin pengguna:', error);
    res.status(500).json({ success: false, message: 'Gagal menyimpan perubahan.' });
  }
});

module.exports = router;