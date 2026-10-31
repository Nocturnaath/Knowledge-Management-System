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

async function ensureVersionTable() {
  await db.documentVersionTableReady;
}

async function recordVersion(document, userId, eventTypeOverride = null) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS versionCount
     FROM document_versions
     WHERE LOWER(title) = LOWER(?)`,
    [document.title],
  );
  const versionCount = Number(rows[0].versionCount || 0);
  await db.query(
    `INSERT INTO document_versions
      (document_id, version_number, user_id, title, file_name, stored_file_name, category, description, event_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      document.id,
      versionCount + 1,
      userId,
      document.title,
      document.fileName,
      document.storedFileName,
      document.category,
      document.description,
      eventTypeOverride || (versionCount === 0 ? 'upload' : 'update'),
    ],
  );
}

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

router.get('/:id/versions', verifyToken, async (req, res) => {
  try {
    await ensureVersionTable();
    const [documents] = await db.query(
      'SELECT title FROM documents WHERE id = ?',
      [req.params.id],
    );
    if (documents.length === 0) {
      return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan.' });
    }

    const [versions] = await db.query(
      `SELECT
        v.id,
        v.version_number AS version,
        v.title,
        v.file_name AS fileName,
        v.stored_file_name AS storedFileName,
        v.category,
        v.description,
        v.event_type AS eventType,
        v.created_at AS createdAt,
        u.nama_lengkap AS uploader
      FROM document_versions v
      JOIN users u ON u.id = v.user_id
      WHERE v.document_id = ? OR LOWER(v.title) = LOWER(?)
      ORDER BY v.created_at ASC, v.id ASC`,
      [req.params.id, documents[0].title],
    );
    return res.json({ success: true, versions });
  } catch (error) {
    console.error('Error mengambil versi dokumen:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil riwayat versi dokumen.' });
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

router.get('/aktivitas', verifyToken, async (req, res) => {
  try {
    await ensureVersionTable();
    const [rows] = await db.query(
      `SELECT
        v.id,
        v.title AS documentName,
        v.event_type AS eventType,
        v.created_at AS createdAt,
        owner.nama_lengkap AS uploader
      FROM document_versions v
      JOIN users owner ON owner.id = v.user_id
      ORDER BY v.created_at DESC
      LIMIT 50`,
    );
    return res.json({ success: true, activities: rows });
  } catch (error) {
    console.error('Error mengambil aktivitas dokumen:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil aktivitas dokumen.' });
  }
});

router.get('/ringkasan', verifyToken, async (req, res) => {
  try {
    await ensureVersionTable();
    const [countRows] = await db.query(
      `SELECT
        COUNT(*) AS totalDocuments,
        SUM(user_id = ?) AS ownDocuments,
        SUM(user_id = ? AND status = 'pending') AS pendingDocuments
      FROM documents d
      JOIN users owner ON owner.id = d.user_id
      WHERE owner.divisi_id = ?`,
      [req.user.id, req.user.id, req.user.divisi_id],
    );
    const [activityRows] = await db.query(
      `SELECT
        v.id,
        v.title AS documentName,
        v.event_type AS eventType,
        v.created_at AS createdAt,
        owner.nama_lengkap AS uploader
      FROM document_versions v
      JOIN users owner ON owner.id = v.user_id
      JOIN documents d ON d.id = v.document_id
      WHERE owner.divisi_id = ?
      ORDER BY v.created_at DESC
      LIMIT 10`,
      [req.user.divisi_id],
    );

    return res.json({
      success: true,
      counts: {
        totalDocuments: Number(countRows[0].totalDocuments || 0),
        ownDocuments: Number(countRows[0].ownDocuments || 0),
        pendingDocuments: Number(countRows[0].pendingDocuments || 0),
      },
      activities: activityRows,
    });
  } catch (error) {
    console.error('Error mengambil ringkasan dokumen:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil ringkasan dokumen.',
    });
  }
});

router.put('/:id', verifyToken, (req, res) => {
  upload.single('file')(req, res, async (uploadError) => {
    if (uploadError) {
      return res.status(400).json({ success: false, message: uploadError.message });
    }

    const { title, category, description, publicAccess } = req.body;
    if (!title || !category || !description) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Judul, kategori, dan deskripsi wajib diisi.' });
    }

    try {
      await ensureVersionTable();
      const [documents] = await db.query(
        `SELECT id, title, file_name AS fileName, stored_file_name AS storedFileName,
          category, description FROM documents WHERE id = ? AND user_id = ?`,
        [req.params.id, req.user.id],
      );
      if (documents.length === 0) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan.' });
      }

      const oldFileName = documents[0].storedFileName;
      const storedFileName = req.file ? req.file.filename : oldFileName;
      await db.query(
        `UPDATE documents
         SET title = ?, category = ?, description = ?, public_access = ?, stored_file_name = ?, file_name = ?, created_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?`,
        [
          title.trim(),
          category,
          description.trim(),
          publicAccess === 'true',
          storedFileName,
          req.file ? req.file.originalname : documents[0].fileName,
          req.params.id,
          req.user.id,
        ],
      );
      await recordVersion({
        id: Number(req.params.id),
        title: title.trim(),
        fileName: req.file ? req.file.originalname : documents[0].fileName,
        storedFileName,
        category,
        description: description.trim(),
      }, req.user.id, 'update');

      if (req.file && oldFileName !== storedFileName) {
        const oldPath = path.join(uploadDirectory, oldFileName);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      return res.json({ success: true, message: 'Dokumen berhasil diperbarui.' });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      console.error('Error memperbarui dokumen:', error);
      return res.status(500).json({ success: false, message: 'Gagal memperbarui dokumen.' });
    }
  });
});

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const [documents] = await db.query(
      'SELECT stored_file_name AS storedFileName FROM documents WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id],
    );
    if (documents.length === 0) {
      return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan.' });
    }
    await db.query('DELETE FROM documents WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    const filePath = path.join(uploadDirectory, documents[0].storedFileName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return res.json({ success: true, message: 'Dokumen berhasil dihapus.' });
  } catch (error) {
    console.error('Error menghapus dokumen:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus dokumen.' });
  }
});

router.get('/', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
        id,
        title AS name,
        file_name AS fileName,
        stored_file_name AS storedFileName,
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
      await ensureVersionTable();
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
      await recordVersion({
        id: result.insertId,
        title: title.trim(),
        fileName: req.file.originalname,
        storedFileName: req.file.filename,
        category,
        description: description.trim(),
      }, req.user.id);

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
