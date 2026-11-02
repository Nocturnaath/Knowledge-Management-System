const express = require('express');
const db = require('../config/db');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();
// Komponen teknis tetap dihitung, tetapi isi dokumennya dibatasi pada endpoint detail.
const REQUIRED_COMPONENTS = [
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
];
const INTERNAL_COMPONENTS = ['Data Model', 'Application Architecture', 'API & Integration'];

function requireApplicationManager(req, res, next) {
  if (!['admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Anda tidak memiliki akses untuk mengelola rumpun aplikasi.' });
  }
  next();
}

// GET /api/aplikasi
// Aturan: divisi SI melihat semua aplikasi.
//         Divisi lain hanya melihat aplikasi yang dikelola divisinya sendiri.
router.get('/', verifyToken, async (req, res) => {
  try {
    // 1. Cari tahu divisi pengguna dari token (req.user.divisi_id)
    const [divisiRows] = await db.query(
      'SELECT kode_divisi FROM divisi WHERE id = ?',
      [req.user.divisi_id]
    );
    const lihatSemua = divisiRows[0]?.kode_divisi === 'SI';

    // 2. Ambil aplikasi; kalau bukan divisi SI, saring berdasarkan divisi
    let sql = `
      SELECT a.id,
             a.nama_aplikasi AS nama,
             a.status,
             COUNT(DISTINCT d.category) AS terisi,
             a.rumpun_id AS rumpunId,
             r.nama_rumpun AS rumpun
      FROM applications a
      JOIN rumpun r ON r.id = a.rumpun_id
      LEFT JOIN documents d
        ON d.application = a.nama_aplikasi
       AND d.status = 'approved'
        AND d.category IN (${REQUIRED_COMPONENTS.map(() => '?').join(', ')})
    `;
    // Semua pengguna melihat skor dari 10 komponen; pembatasan hanya berlaku saat membuka isi dokumen.
    const params = [...REQUIRED_COMPONENTS];
    if (!lihatSemua) {
      sql += ' WHERE a.divisi_id = ?';
      params.push(req.user.divisi_id);
    }
    sql += ' GROUP BY a.id, a.nama_aplikasi, a.status, a.rumpun_id, r.nama_rumpun ORDER BY a.id';

    const [aplikasi] = await db.query(sql, params);
    const canViewInternal = lihatSemua || req.user.role === 'staff_it';
    const [tagRows] = await db.query(
      `SELECT application, tags FROM documents
       WHERE status = ? AND application IS NOT NULL
       ${canViewInternal ? '' : `AND category NOT IN (${INTERNAL_COMPONENTS.map(() => '?').join(', ')})`}
       `,
      ['approved', ...(canViewInternal ? [] : INTERNAL_COMPONENTS)],
    );
    const tagsByApplication = new Map();
    tagRows.forEach((row) => {
      let tags = [];
      try {
        tags = JSON.parse(row.tags || '[]');
      } catch {
        tags = String(row.tags || '').split(',').filter(Boolean);
      }
      const current = tagsByApplication.get(row.application) || new Set();
      tags.forEach((tag) => current.add(tag));
      tagsByApplication.set(row.application, current);
    });
    aplikasi.forEach((item) => {
      item.tags = [...(tagsByApplication.get(item.nama) || [])];
    });
    const [rumpun] = await db.query('SELECT id, nama_rumpun AS nama FROM rumpun ORDER BY id');

    res.json({ success: true, lihatSemua, rumpun, aplikasi });
  } catch (error) {
    console.error('Error memuat aplikasi:', error);
    res.status(500).json({ success: false, message: 'Gagal memuat daftar aplikasi.' });
  }
});

router.get('/options', verifyToken, async (req, res) => {
  try {
    const [applications] = await db.query(
      'SELECT id, nama_aplikasi AS nama FROM applications ORDER BY nama_aplikasi'
    );
    return res.json({ success: true, applications });
  } catch (error) {
    console.error('Error memuat pilihan aplikasi:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat pilihan aplikasi.',
    });
  }
});

router.get('/rumpun/manage', verifyToken, async (req, res) => {
  try {
    const [rumpun] = await db.query(
      `SELECT r.id, r.nama_rumpun AS name, COUNT(a.id) AS applicationCount
       FROM rumpun r
       LEFT JOIN applications a ON a.rumpun_id = r.id
       GROUP BY r.id, r.nama_rumpun
       ORDER BY r.nama_rumpun`,
    );
    return res.json({ success: true, rumpun });
  } catch (error) {
    console.error('Error memuat rumpun aplikasi:', error);
    return res.status(500).json({ success: false, message: 'Gagal memuat rumpun aplikasi.' });
  }
});

router.post('/rumpun', verifyToken, requireApplicationManager, async (req, res) => {
  const name = req.body.name?.trim();
  if (!name) return res.status(400).json({ success: false, message: 'Nama rumpun wajib diisi.' });
  if (name.length > 150) return res.status(400).json({ success: false, message: 'Nama rumpun maksimal 150 karakter.' });

  try {
    const [result] = await db.query('INSERT INTO rumpun (nama_rumpun) VALUES (?)', [name]);
    return res.status(201).json({ success: true, rumpun: { id: result.insertId, name, applicationCount: 0 } });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Rumpun tersebut sudah ada.' });
    }
    console.error('Error menambah rumpun:', error);
    return res.status(500).json({ success: false, message: 'Gagal menambah rumpun.' });
  }
});

router.put('/rumpun/:id', verifyToken, requireApplicationManager, async (req, res) => {
  const name = req.body.name?.trim();
  if (!name) return res.status(400).json({ success: false, message: 'Nama rumpun wajib diisi.' });
  if (name.length > 150) return res.status(400).json({ success: false, message: 'Nama rumpun maksimal 150 karakter.' });

  try {
    const [result] = await db.query(
      'UPDATE rumpun SET nama_rumpun = ? WHERE id = ?',
      [name, req.params.id],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Rumpun tidak ditemukan.' });
    }
    return res.json({ success: true, rumpun: { id: Number(req.params.id), name } });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Rumpun tersebut sudah ada.' });
    }
    console.error('Error mengubah rumpun:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengubah rumpun.' });
  }
});

router.delete('/rumpun/:id', verifyToken, requireApplicationManager, async (req, res) => {
  try {
    const [applications] = await db.query(
      'SELECT COUNT(*) AS applicationCount FROM applications WHERE rumpun_id = ?',
      [req.params.id],
    );
    if (Number(applications[0]?.applicationCount || 0) > 0) {
      return res.status(409).json({ success: false, message: 'Rumpun yang masih dipakai aplikasi tidak dapat dihapus.' });
    }
    const [result] = await db.query('DELETE FROM rumpun WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Rumpun tidak ditemukan.' });
    }
    return res.json({ success: true, message: 'Rumpun berhasil dihapus.' });
  } catch (error) {
    console.error('Error menghapus rumpun:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus rumpun.' });
  }
});

router.get('/:id/dokumen', verifyToken, async (req, res) => {
  try {
    const [applicationRows] = await db.query(
      'SELECT nama_aplikasi AS nama, divisi_id AS divisiId FROM applications WHERE id = ?',
      [req.params.id]
    );

    const application = applicationRows[0];
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Aplikasi tidak ditemukan.',
      });
    }

    const [userRows] = await db.query(
      'SELECT divisi_id AS divisiId, (SELECT kode_divisi FROM divisi WHERE id = ?) AS kodeDivisi FROM users WHERE id = ?',
      [req.user.divisi_id, req.user.id]
    );
    const user = userRows[0];
    const canSeeAll = user?.kodeDivisi === 'SI';
    // Staff IT juga boleh membuka tiga komponen teknis internal.
    const canViewInternal = canSeeAll || req.user.role === 'staff_it';
    if (!canSeeAll && application.divisiId !== req.user.divisi_id) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki akses ke aplikasi ini.',
      });
    }

    const [documents] = await db.query(
      `SELECT
        d.id,
        d.title AS name,
        d.file_name AS fileName,
        d.stored_file_name AS storedFileName,
        d.category,
        c.category_type AS categoryType,
        d.tags,
        d.description,
        d.created_at AS createdAt
      FROM documents d
      LEFT JOIN categories c ON c.name = d.category
      JOIN users owner ON owner.id = d.user_id
      WHERE d.application = ?
        AND d.status = 'approved'
        AND (? = 1 OR d.category NOT IN (?, ?, ?))
        AND (? = 1 OR d.public_access = TRUE OR owner.divisi_id = ?)
      ORDER BY d.created_at DESC`,
      [application.nama, canViewInternal ? 1 : 0, ...INTERNAL_COMPONENTS, canSeeAll ? 1 : 0, req.user.divisi_id]
    );

    return res.json({
      success: true,
      documents: documents.map((document) => {
        let tags = [];
        try {
          tags = JSON.parse(document.tags || '[]');
        } catch {
          tags = String(document.tags || '').split(',').filter(Boolean);
        }
        return { ...document, tags };
      }),
    });
  } catch (error) {
    console.error('Error mengambil dokumen aplikasi:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil dokumen aplikasi.',
    });
  }
});

module.exports = router;