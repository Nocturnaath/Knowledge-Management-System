const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');
const { verifyToken } = require('../middleware/authMiddleware');

// 1. Endpoint Login: POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Username dan kata sandi wajib diisi!' 
    });
  }

  try {
    console.log(`Mencoba login dengan username: ${username}`);
    // Ambil data user beserta nama divisinya
    const query = `
      SELECT u.id, u.username, u.password, u.nama_lengkap, u.email, u.role, u.foto_url,
             d.nama_divisi, u.divisi_id
      FROM users u
      LEFT JOIN divisi d ON u.divisi_id = d.id
      WHERE u.username = ?
    `;
    const [rows] = await db.query(query, [username]);
    console.log('Hasil user ditemukan:', rows.length);
    if (rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Username atau kata sandi salah.' 
      });
    }

    const user = rows[0];

    // Cek kecocokan password bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Username atau kata sandi salah.' 
      });
    }

    // Buat JWT Token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, divisi_id: user.divisi_id },
      process.env.JWT_SECRET || 'rahasia_cbijak_jwt_key_2026',
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      message: 'Login berhasil!',
      token,
      user: {
        id: user.id,
        username: user.username,
        nama: user.nama_lengkap,
        email: user.email,
        divisi: user.nama_divisi || 'Lintas Divisi',
        role: user.role,
        photoUrl: user.foto_url
      }
    });
  } catch (error) {
    console.error('Error saat login:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
  }
});

// 2. Endpoint Ambil Profil Pengguna Login: GET /api/auth/me
router.get('/me', verifyToken, async (req, res) => {
  try {
    const query = `
      SELECT u.id, u.username, u.nama_lengkap, u.email, u.role, u.foto_url,
             d.nama_divisi
      FROM users u
      LEFT JOIN divisi d ON u.divisi_id = d.id
      WHERE u.id = ?
    `;
    const [rows] = await db.query(query, [req.user.id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    }

    const user = rows[0];
    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        nama: user.nama_lengkap,
        email: user.email,
        divisi: user.nama_divisi || 'Lintas Divisi',
        role: user.role,
        photoUrl: user.foto_url
      }
    });
  } catch (error) {
    console.error('Error ambil profil:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan mengambil profil.' });
  }
});

// 3. Endpoint Unggah Foto Profil: POST /api/auth/profile/photo (field form: "foto")
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) =>
      cb(null, `u${req.user.id}-${Date.now()}${path.extname(file.originalname).toLowerCase()}`)
  }),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req, file, cb) =>
    file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('File harus berupa gambar.'))
});

router.post('/profile/photo', verifyToken, upload.single('foto'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Pilih foto terlebih dahulu.' });
  }
  try {
    const photoUrl = `/uploads/${req.file.filename}`;
    await db.query('UPDATE users SET foto_url = ? WHERE id = ?', [photoUrl, req.user.id]);
    res.json({ success: true, photoUrl });
  } catch (error) {
    console.error('Error simpan foto:', error);
    res.status(500).json({ success: false, message: 'Gagal menyimpan foto profil.' });
  }
});

module.exports = router;