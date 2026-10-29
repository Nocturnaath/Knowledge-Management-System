const express = require('express');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const WordExtractor = require('word-extractor');
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

function requireReviewer(req, res, next) {
  if (!['admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Anda tidak memiliki akses persetujuan dokumen.' });
  }
  next();
}

router.get('/persetujuan', verifyToken, requireReviewer, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
        d.id,
        d.title AS name,
        d.file_name AS fileName,
        d.stored_file_name AS storedFileName,
        d.category,
        d.application,
        d.description,
        d.status,
        d.created_at AS createdAt,
        owner.nama_lengkap AS uploader,
        divisi.nama_divisi AS division
      FROM documents d
      JOIN users owner ON owner.id = d.user_id
      LEFT JOIN divisi ON divisi.id = owner.divisi_id
      WHERE d.status IN ('pending', 'approved', 'rejected')
      ORDER BY d.created_at DESC`,
    );
    return res.json({ success: true, documents: rows });
  } catch (error) {
    console.error('Error mengambil dokumen persetujuan:', error);
    return res.status(500).json({ success: false, message: 'Gagal memuat dokumen persetujuan.' });
  }
});

router.patch('/:id/status', verifyToken, requireReviewer, async (req, res) => {
  const { status, note } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Status persetujuan tidak valid.' });
  }

  try {
    const [result] = await db.query(
      'UPDATE documents SET status = ? WHERE id = ? AND status = ?',
      [status, req.params.id, 'pending'],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan atau sudah diproses.' });
    }

    console.log(`Dokumen ${req.params.id} ${status} oleh ${req.user.id}. Catatan: ${note || '-'}`);
    return res.json({ success: true, message: status === 'approved' ? 'Dokumen disetujui.' : 'Dokumen ditolak.' });
  } catch (error) {
    console.error('Error memperbarui status dokumen:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui status dokumen.' });
  }
});

router.get('/preview/:fileName', verifyToken, async (req, res) => {
  const fileName = path.basename(req.params.fileName);
  const filePath = path.join(uploadDirectory, fileName);

  if (path.extname(fileName).toLowerCase() !== '.doc') {
    return res.status(400).json({
      success: false,
      message: 'Endpoint pratinjau ini hanya untuk file DOC.',
    });
  }

  try {
    const extractor = new WordExtractor();
    const document = await extractor.extract(filePath);
    return res.json({ success: true, text: document.getBody() });
  } catch (error) {
    console.error('Error memproses pratinjau DOC:', error);
    return res.status(500).json({
      success: false,
      message: 'File DOC tidak dapat dipratinjau. Silakan unduh file tersebut.',
    });
  }
});

router.get('/divisi', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
        d.id,
        d.title AS name,
        d.file_name AS fileName,
        d.stored_file_name AS storedFileName,
        d.category,
        d.status,
        d.created_at AS createdAt,
        CONCAT(owner.nama_lengkap) AS uploader
      FROM documents d
      JOIN users owner ON owner.id = d.user_id
      WHERE owner.divisi_id = ?
      ORDER BY d.created_at DESC`,
      [req.user.divisi_id]
    );

    return res.json({ success: true, documents: rows });
  } catch (error) {
    console.error('Error mengambil dokumen divisi:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil dokumen divisi.',
    });
  }
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
