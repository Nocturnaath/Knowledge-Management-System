
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');
const { verifyToken } = require('../middleware/authMiddleware');

// ==================================================
// 1. LOGIN: POST /api/auth/login
// ==================================================
router.post('/login', async (req, res) => {
  const { sso_id, password } = req.body;

  // Pastikan ID Karyawan dan kata sandi diisi.
  if (!sso_id || !password) {
    return res.status(400).json({
      success: false,
      message: 'ID Karyawan dan kata sandi wajib diisi!'
    });
  }

  try {
    // Ambil data pengguna beserta nama divisi dan jabatan.
    const query = `
      SELECT
        u.id,
        u.sso_id,
        u.username,
        u.password,
        u.nama_lengkap,
        u.email,
        u.jabatan,
        u.role,
        u.foto_url,
        u.divisi_id,
        d.nama_divisi
      FROM users u
      LEFT JOIN divisi d ON u.divisi_id = d.id
      WHERE u.sso_id = ?
    `;

    const [rows] = await db.query(query, [sso_id]);

    // Jika ID Karyawan tidak ditemukan.
    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'ID Karyawan atau kata sandi salah.'
      });
    }

    const user = rows[0];

    // Periksa kata sandi dengan bcrypt.
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'ID Karyawan atau kata sandi salah.'
      });
    }

    // Buat token autentikasi.
    const token = jwt.sign(
      {
        id: user.id,
        sso_id: user.sso_id,
        username: user.username,
        role: user.role,
        divisi_id: user.divisi_id
      },
      process.env.JWT_SECRET || 'rahasia_cbijak_jwt_key_2026',
      { expiresIn: '8h' }
    );

    // Kirim token dan data pengguna ke frontend.
    return res.json({
      success: true,
      message: 'Login berhasil!',
      token,
      user: {
        id: user.id,
        ssoId: user.sso_id,
        username: user.username,
        nama: user.nama_lengkap,
        email: user.email,
        jabatan: user.jabatan,
        divisi: user.nama_divisi || 'Lintas Divisi',
        role: user.role,
        photoUrl: user.foto_url
      }
    });
  } catch (error) {
    console.error('Error saat login:', error);

    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server.'
    });
  }
});

// ==================================================
// 2. AMBIL PROFIL PENGGUNA: GET /api/auth/me
// ==================================================
router.get('/me', verifyToken, async (req, res) => {
  try {
    // Ambil data terbaru dari database.
    const query = `
      SELECT
        u.id,
        u.sso_id,
        u.username,
        u.nama_lengkap,
        u.email,
        u.jabatan,
        u.role,
        u.foto_url,
        u.divisi_id,
        d.nama_divisi
      FROM users u
      LEFT JOIN divisi d ON u.divisi_id = d.id
      WHERE u.id = ?
    `;

    const [rows] = await db.query(query, [req.user.id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pengguna tidak ditemukan.'
      });
    }

    const user = rows[0];

    // Perhatikan: gunakan variabel user, bukan row.
    return res.json({
      success: true,
      user: {
        id: user.id,
        ssoId: user.sso_id,
        username: user.username,
        nama: user.nama_lengkap,
        email: user.email,
        jabatan: user.jabatan,
        divisi: user.nama_divisi || 'Lintas Divisi',
        role: user.role,
        photoUrl: user.foto_url
      }
    });
  } catch (error) {
    console.error('Error ambil profil:', error);

    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan mengambil profil.'
    });
  }
});

// ==================================================
// 3. KONFIGURASI UNGGAH FOTO PROFIL
// ==================================================
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

// Buat folder uploads jika belum tersedia.
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,

    // Nama file dibuat unik berdasarkan ID dan waktu unggah.
    filename: (req, file, cb) => {
      cb(
        null,
        `u${req.user.id}-${Date.now()}${path.extname(file.originalname).toLowerCase()}`
      );
    }
  }),

  // Maksimal ukuran foto adalah 2 MB.
  limits: { fileSize: 2 * 1024 * 1024 },

  // Hanya izinkan file gambar.
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      return cb(null, true);
    }

    return cb(new Error('File harus berupa gambar.'));
  }
});

// ==================================================
// 4. UNGGAH FOTO: POST /api/auth/profile/photo
// ==================================================
router.post(
  '/profile/photo',
  verifyToken,
  upload.single('foto'),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Pilih foto terlebih dahulu.'
      });
    }

    try {
      const photoUrl = `/uploads/${req.file.filename}`;

      // Simpan alamat foto baru pada data pengguna.
      await db.query(
        'UPDATE users SET foto_url = ? WHERE id = ?',
        [photoUrl, req.user.id]
      );

      return res.json({
        success: true,
        photoUrl
      });
    } catch (error) {
      console.error('Error simpan foto:', error);

      return res.status(500).json({
        success: false,
        message: 'Gagal menyimpan foto profil.'
      });
    }
  }
);

module.exports = router;
