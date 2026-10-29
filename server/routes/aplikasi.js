const express = require('express');
const db = require('../config/db');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

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
             a.komponen_terisi AS terisi,
             a.rumpun_id AS rumpunId,
             r.nama_rumpun AS rumpun
      FROM applications a
      JOIN rumpun r ON r.id = a.rumpun_id
    `;
    const params = [];
    if (!lihatSemua) {
      sql += ' WHERE a.divisi_id = ?';
      params.push(req.user.divisi_id);
    }
    sql += ' ORDER BY a.id';

    const [aplikasi] = await db.query(sql, params);
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
        d.description,
        d.created_at AS createdAt
      FROM documents d
      JOIN users owner ON owner.id = d.user_id
      WHERE d.application = ?
        AND d.status = 'approved'
        AND (? = 1 OR d.public_access = TRUE OR owner.divisi_id = ?)
      ORDER BY d.created_at DESC`,
      [application.nama, canSeeAll ? 1 : 0, req.user.divisi_id]
    );

    return res.json({ success: true, documents });
  } catch (error) {
    console.error('Error mengambil dokumen aplikasi:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil dokumen aplikasi.',
    });
  }
});

module.exports = router;