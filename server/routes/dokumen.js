const express = require('express');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const db = require('../config/db');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();
const uploadDirectory = path.join(__dirname, '..', 'uploads', 'documents');
fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDirectory,
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${req.user.id}-${Date.now()}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'];
    const extension = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      return callback(new Error('Format file harus PDF, DOC, DOCX, XLS, atau XLSX.'));
    }
    callback(null, true);
  },
});

router.get('/', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
        id,
        title AS name,
        file_name AS fileName,
        category,
        application,
        description,
        status,
        public_access AS publicAccess,
        created_at AS updatedAt
      FROM documents
      WHERE user_id = ?
      ORDER BY created_at DESC`,
      [req.user.id]
    );

    return res.json({ success: true, documents: rows });
  } catch (error) {
    console.error('Error mengambil dokumen:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil daftar dokumen.',
    });
  }
});

router.post('/', verifyToken, (req, res) => {
  upload.single('file')(req, res, async (uploadError) => {
    if (uploadError) {
      const message = uploadError.code === 'LIMIT_FILE_SIZE'
        ? 'Ukuran file maksimal 50 MB.'
        : uploadError.message;
      return res.status(400).json({ success: false, message });
    }

    const { title, category, application, description, needsApproval, publicAccess } = req.body;
    if (!req.file || !title || !category || !description) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Judul, kategori, deskripsi, dan file wajib diisi.',
      });
    }

    const status = needsApproval === 'true' ? 'pending' : 'approved';

    try {
      const [result] = await db.query(
        `INSERT INTO documents
          (user_id, title, file_name, stored_file_name, category, application, description, status, public_access)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.id,
          title.trim(),
          req.file.originalname,
          req.file.filename,
          category,
          application || null,
          description.trim(),
          status,
          publicAccess === 'true',
        ]
      );

      return res.status(201).json({
        success: true,
        message: 'Dokumen berhasil diunggah.',
        document: {
          id: result.insertId,
          name: title.trim(),
          fileName: req.file.originalname,
          category,
          application: application || null,
          description: description.trim(),
          status,
        },
      });
    } catch (error) {
      fs.unlinkSync(req.file.path);
      console.error('Error menyimpan dokumen:', error);
      return res.status(500).json({
        success: false,
        message: 'Gagal menyimpan dokumen.',
      });
    }
  });
});

module.exports = router;
