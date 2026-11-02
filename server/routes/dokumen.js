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

function normalizeTags(value) {
  // Simpan tag dalam satu format agar pencarian dan filter konsisten.
  const raw = Array.isArray(value) ? value : String(value || '').split(',');
  return [...new Set(raw.map((tag) => tag.trim().replace(/^#+/, '').toLowerCase()).filter(Boolean).map((tag) => `#${tag}`))].slice(0, 20);
}

function parseTags(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return normalizeTags(value);
  }
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
      (document_id, version_number, user_id, title, file_name, stored_file_name, category, tags, description, event_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      document.id,
      versionCount + 1,
      userId,
      document.title,
      document.fileName,
      document.storedFileName,
      document.category,
      JSON.stringify(normalizeTags(document.tags)),
      document.description,
      eventTypeOverride || (versionCount === 0 ? 'upload' : 'update'),
    ],
  );
}

function requireReviewer(req, res, next) {
  getEffectivePermissions(req.user).then((permissions) => {
    req.permissions = permissions;
    if (!permissions.has('review_dokumen') && !permissions.has('acc_final')) {
      return res.status(403).json({ success: false, message: 'Anda tidak memiliki akses persetujuan dokumen.' });
    }
    next();
  }).catch((error) => {
    console.error('Error memeriksa hak persetujuan:', error);
    res.status(500).json({ success: false, message: 'Gagal memeriksa hak persetujuan.' });
  });
}

async function getEffectivePermissions(user) {
  await db.authorizationTablesReady;
  if (user.role === 'super_admin') {
    const [rows] = await db.query('SELECT perm_key FROM permissions');
    return new Set(rows.map((row) => row.perm_key));
  }
  const [defaults] = await db.query('SELECT perm_key FROM role_permissions WHERE role = ?', [user.role]);
  const [overrides] = await db.query(
    'SELECT perm_key, allowed FROM user_permission_overrides WHERE user_id = ?',
    [user.id],
  );
  const permissions = new Set(defaults.map((row) => row.perm_key));
  overrides.forEach((row) => {
    if (row.allowed) permissions.add(row.perm_key);
    else permissions.delete(row.perm_key);
  });
  return permissions;
}

router.get('/persetujuan', verifyToken, requireReviewer, async (req, res) => {
  try {
    await db.authorizationTablesReady;
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
        divisi.nama_divisi AS division,
        latest.action AS lastAction,
        latest.note AS lastNote,
        actor.nama_lengkap AS lastActor
      FROM documents d
      JOIN users owner ON owner.id = d.user_id
      LEFT JOIN divisi ON divisi.id = owner.divisi_id
      LEFT JOIN (
        SELECT l.document_id, l.action, l.note, l.actor_id
        FROM document_approval_logs l
        INNER JOIN (
          SELECT document_id, MAX(id) AS id
          FROM document_approval_logs
          GROUP BY document_id
        ) latest_log ON latest_log.id = l.id
      ) latest ON latest.document_id = d.id
      LEFT JOIN users actor ON actor.id = latest.actor_id
      WHERE d.status IN ('pending', 'approved', 'rejected')
      ORDER BY d.created_at DESC`,
    );
    return res.json({
      success: true,
      documents: rows,
      permissions: {
        canReview: req.permissions.has('review_dokumen'),
        canApprove: req.permissions.has('acc_final'),
      },
    });
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
  if (status === 'approved' && !req.permissions.has('acc_final')) {
    return res.status(403).json({ success: false, message: 'Anda belum mendapat izin ACC Final dari Super Admin.' });
  }
  if (status === 'rejected' && !req.permissions.has('review_dokumen')) {
    return res.status(403).json({ success: false, message: 'Anda belum mendapat izin untuk menolak dokumen.' });
  }

  try {
    await db.authorizationTablesReady;
    const [result] = await db.query(
      'UPDATE documents SET status = ? WHERE id = ? AND status = ?',
      [status, req.params.id, 'pending'],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan atau sudah diproses.' });
    }

    await db.query(
      'INSERT INTO document_approval_logs (document_id, actor_id, action, note) VALUES (?, ?, ?, ?)',
      [req.params.id, req.user.id, status, note || null],
    );
    console.log(`Dokumen ${req.params.id} ${status} oleh ${req.user.id}. Catatan: ${note || '-'}`);
    return res.json({ success: true, message: status === 'approved' ? 'Dokumen disetujui.' : 'Dokumen ditolak.' });
  } catch (error) {
    console.error('Error memperbarui status dokumen:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui status dokumen.' });
  }
});

router.post('/:id/forward', verifyToken, requireReviewer, async (req, res) => {
  if (!req.permissions.has('review_dokumen')) {
    return res.status(403).json({ success: false, message: 'Anda belum mendapat izin untuk meneruskan dokumen.' });
  }
  try {
    await db.authorizationTablesReady;
    const [documents] = await db.query(
      'SELECT id FROM documents WHERE id = ? AND status = ?',
      [req.params.id, 'pending'],
    );
    if (documents.length === 0) {
      return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan atau sudah diproses.' });
    }
    await db.query(
      'INSERT INTO document_approval_logs (document_id, actor_id, action, note) VALUES (?, ?, ?, ?)',
      [req.params.id, req.user.id, 'forwarded', req.body.note || null],
    );
    return res.json({ success: true, message: 'Dokumen telah diteruskan ke Super Admin.' });
  } catch (error) {
    console.error('Error meneruskan dokumen:', error);
    return res.status(500).json({ success: false, message: 'Gagal meneruskan dokumen.' });
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

    return res.json({ success: true, documents: rows.map((row) => ({ ...row, tags: parseTags(row.tags) })) });
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
      UNION ALL
      SELECT
        l.id,
        CONCAT(l.document_count, ' dokumen dipindahkan dari ', l.source_category, ' ke ', l.target_category) AS documentName,
        'category_move' AS eventType,
        l.created_at AS createdAt,
        owner.nama_lengkap AS uploader
      FROM category_activity_logs l
      JOIN users owner ON owner.id = l.actor_id
      ORDER BY createdAt DESC
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
    const canReviewAll = ['admin', 'super_admin'].includes(req.user.role);
    const [countRows] = await db.query(
      `SELECT
        (SELECT COUNT(*)
         FROM documents d
         JOIN users owner ON owner.id = d.user_id
         WHERE owner.divisi_id = ?) AS totalDocuments,
        SUM(user_id = ?) AS ownDocuments,
        SUM(status = 'pending'${canReviewAll ? '' : ' AND user_id = ?'}) AS pendingDocuments
      FROM documents`,
      canReviewAll
        ? [req.user.divisi_id, req.user.id]
        : [req.user.divisi_id, req.user.id, req.user.id],
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
      UNION ALL
      SELECT
        l.id,
        CONCAT(l.document_count, ' dokumen dipindahkan dari ', l.source_category, ' ke ', l.target_category) AS documentName,
        'category_move' AS eventType,
        l.created_at AS createdAt,
        owner.nama_lengkap AS uploader
      FROM category_activity_logs l
      JOIN users owner ON owner.id = l.actor_id
      ORDER BY createdAt DESC
      LIMIT 10`,
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

    const { title, category, tags, description, publicAccess } = req.body;
    if (!title || !category || !description) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Judul, kategori, dan deskripsi wajib diisi.' });
    }

    try {
      await ensureVersionTable();
      const [documents] = await db.query(
        `SELECT id, title, file_name AS fileName, stored_file_name AS storedFileName,
          category, tags, description FROM documents WHERE id = ? AND user_id = ?`,
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
         SET title = ?, category = ?, tags = ?, description = ?, public_access = ?, stored_file_name = ?, file_name = ?, created_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?`,
        [
          title.trim(),
          category,
          JSON.stringify(normalizeTags(tags)),
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
        tags,
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
        tags,
        description,
        status,
        public_access AS publicAccess,
        created_at AS updatedAt
      FROM documents
      WHERE user_id = ?
      ORDER BY created_at DESC`,
      [req.user.id]
    );

    return res.json({ success: true, documents: rows.map((row) => ({ ...row, tags: parseTags(row.tags) })) });
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

    const { title, category, application, tags, description, needsApproval, publicAccess } = req.body;
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
          (user_id, title, file_name, stored_file_name, category, application, tags, description, status, public_access)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.id,
          title.trim(),
          req.file.originalname,
          req.file.filename,
          category,
          application || null,
          JSON.stringify(normalizeTags(tags)),
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
        tags,
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
          tags: normalizeTags(tags),
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
