const express = require('express');
const db = require('../config/db');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/informasi-umum
// Hanya dokumen yang sudah disetujui dan diberi flag akses publik (lintas divisi)
router.get('/', verifyToken, async (req, res) => {
  try {
    const [kategori] = await db.query(
      `SELECT name
       FROM categories
       WHERE category_type = 'informasi'
       ORDER BY name`,
    );
    const namaKategori = kategori.map((item) => item.name);
    const [dokumen] = await db.query(
      `SELECT d.id,
              d.title AS judul,
              d.description AS deskripsi,
              d.category AS kategori,
              d.file_name AS fileName,
              d.stored_file_name AS storedFileName,
              d.created_at AS tanggal,
              u.nama_lengkap AS pengunggah
       FROM documents d
       JOIN users u ON u.id = d.user_id
       WHERE d.category IN (?)
         AND d.status = 'approved'
         AND d.public_access = TRUE
       ORDER BY d.created_at DESC`,
      [namaKategori]
    );

    res.json({ success: true, kategori: namaKategori, dokumen });
  } catch (error) {
    console.error('Error memuat informasi umum:', error);
    res.status(500).json({ success: false, message: 'Gagal memuat informasi umum.' });
  }
});

module.exports = router;