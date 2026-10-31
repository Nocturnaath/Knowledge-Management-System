const express = require('express');
const db = require('../config/db');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

// Kategori yang tampil di halaman Informasi Umum
const KATEGORI = ['Notulensi', 'Memorandum', 'RAB', 'Evidence Harian', 'Manajemen Risiko SPI'];

// GET /api/informasi-umum
// Hanya dokumen yang sudah disetujui dan diberi flag akses publik (lintas divisi)
router.get('/', verifyToken, async (req, res) => {
  try {
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
      [KATEGORI]
    );

    res.json({ success: true, dokumen });
  } catch (error) {
    console.error('Error memuat informasi umum:', error);
    res.status(500).json({ success: false, message: 'Gagal memuat informasi umum.' });
  }
});

module.exports = router;