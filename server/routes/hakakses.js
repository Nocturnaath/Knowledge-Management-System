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
    await db.authorizationTablesReady;
    const [permissionRows] = await db.query('SELECT perm_key, label FROM permissions');
    const izin = permissionRows.map((permission) => ({
      key: permission.perm_key,
      label: permission.label,
    }));
    izin.sort((a, b) => URUTAN.indexOf(a.key) - URUTAN.indexOf(b.key));

    const [rolePerm] = await db.query(`
      SELECT r.slug AS role, rp.perm_key
      FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id
    `);
    await db.query(`
      INSERT IGNORE INTO user_permissions (user_id, perm_key, allowed)
      SELECT user_id, perm_key, allowed FROM user_permission_overrides
    `);
    const [override] = await db.query('SELECT user_id, perm_key, allowed FROM user_permissions');
    const [users] = await db.query(`
      SELECT u.id, u.nama_lengkap AS nama, u.jabatan, u.role, d.nama_divisi AS divisi
      FROM users u
      LEFT JOIN divisi d ON d.id = u.divisi_id
      ORDER BY u.id
    `);
    const [userRoleRows] = await db.query(`
      SELECT ur.user_id, r.slug
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
    `);

    const peran = PERAN.map((p) => ({
      ...p,
      izin: rolePerm.filter((r) => r.role === p.key).map((r) => r.perm_key)
    }));

    // Izin efektif pengguna = gabungan semua peran, lalu ditimpa pengecualian (override)
    const pengguna = users.map((u) => {
      const roleKeys = [
        ...new Set([
          u.role,
          ...userRoleRows.filter((row) => row.user_id === u.id).map((row) => row.slug),
        ]),
      ];
      const set = new Set(
        rolePerm
          .filter((permission) => roleKeys.includes(permission.role))
          .map((permission) => permission.perm_key)
      );
      override
        .filter((o) => o.user_id === u.id)
        .forEach((o) => (o.allowed ? set.add(o.perm_key) : set.delete(o.perm_key)));
      return { ...u, roles: roleKeys, izin: [...set] };
    });

    res.json({ success: true, izin, peran, pengguna, override });
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
    await db.authorizationTablesReady;
    if (allowed) {
      await db.query(`
        INSERT IGNORE INTO role_permissions (role_id, perm_key)
        SELECT id, ? FROM roles WHERE slug = ?
      `, [perm_key, role]);
    } else {
      await db.query(`
        DELETE rp FROM role_permissions rp
        JOIN roles r ON r.id = rp.role_id
        WHERE r.slug = ? AND rp.perm_key = ?
      `, [role, perm_key]);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error mengubah izin peran:', error);
    res.status(500).json({ success: false, message: 'Gagal menyimpan perubahan.' });
  }
});

// PUT /api/hak-akses/pengguna/:id/peran body: { role }
router.put('/pengguna/:id/peran', async (req, res) => {
  const { id } = req.params;
  const roles = Array.isArray(req.body.roles)
    ? req.body.roles
    : (req.body.role ? [req.body.role] : []);

  if (
    roles.length === 0 ||
    roles.some((role) => !PERAN.some((p) => p.key === role))
  ) {
    return res.status(400).json({ success: false, message: 'Peran tidak valid.' });
  }
  const uniqueRoles = [...new Set(roles)];

  try {
    await db.authorizationTablesReady;
    const [users] = await db.query('SELECT role FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    }
    const primaryRole = uniqueRoles.includes('super_admin')
      ? 'super_admin'
      : uniqueRoles.includes('admin')
        ? 'admin'
        : uniqueRoles[0];

    await db.query('UPDATE users SET role = ? WHERE id = ?', [primaryRole, id]);
    await db.query(`
      DELETE ur FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = ? AND r.is_system = TRUE
    `, [id]);
    for (const role of uniqueRoles) {
      await db.query(`
        INSERT IGNORE INTO user_roles (user_id, role_id)
        SELECT ?, id FROM roles WHERE slug = ?
      `, [id, role]);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error mengubah peran pengguna:', error);
    res.status(500).json({ success: false, message: 'Gagal mengubah peran pengguna.' });
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
    await db.authorizationTablesReady;
    const [users] = await db.query('SELECT role FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    }
    if (users[0].role === 'super_admin') {
      return res.status(400).json({ success: false, message: 'Hak akses Super Admin tidak dapat diubah.' });
    }

    const [dasar] = await db.query(
      `SELECT 1
       FROM user_roles ur
       JOIN role_permissions rp ON rp.role_id = ur.role_id
       WHERE ur.user_id = ? AND rp.perm_key = ?
       UNION
       SELECT 1
       FROM role_permissions rp
       JOIN roles r ON r.id = rp.role_id
       WHERE r.slug = ? AND rp.perm_key = ?
       LIMIT 1`,
      [id, perm_key, users[0].role, perm_key]
    );
    const adaDiDefault = dasar.length > 0;

    if (Boolean(allowed) === adaDiDefault) {
      await db.query('DELETE FROM user_permission_overrides WHERE user_id = ? AND perm_key = ?', [id, perm_key]);
      await db.query('DELETE FROM user_permissions WHERE user_id = ? AND perm_key = ?', [id, perm_key]);
    } else {
      await db.query(
        `INSERT INTO user_permission_overrides (user_id, perm_key, allowed) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE allowed = VALUES(allowed)`,
        [id, perm_key, allowed ? 1 : 0]
      );
      await db.query(
        `INSERT INTO user_permissions (user_id, perm_key, allowed) VALUES (?, ?, ?)
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
