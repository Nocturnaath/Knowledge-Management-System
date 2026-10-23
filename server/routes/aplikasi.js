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

module.exports = router;