const express = require('express');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { getEffectivePermissions } = require('../middleware/authMiddleware');
const { isPublicDocumentAccessible } = require('../utils/authorization');

const router = express.Router();
const uploadDirectory = path.join(__dirname, '..', 'uploads', 'documents');

router.get('/:identifier', async (req, res) => {
  const identifier = path.basename(req.params.identifier);
  try {
    await db.authorizationTablesReady;
    const [documents] = await db.query(
      `SELECT d.id, d.file_name AS fileName, d.stored_file_name AS storedFileName,
              d.status, d.is_public AS isPublic, d.user_id AS ownerId,
              owner.divisi_id AS divisionId
       FROM documents d JOIN users owner ON owner.id = d.user_id
       WHERE d.id = ? OR d.stored_file_name = ?
       LIMIT 1`,
      [Number.isInteger(Number(identifier)) ? Number(identifier) : 0, identifier],
    );
    const document = documents[0];
    if (!document) return res.status(404).json({ success: false, message: 'File tidak ditemukan.' });

    let allowed = isPublicDocumentAccessible(document);
    if (!allowed) {
      const token = req.query.token || req.headers.authorization?.split(' ')[1];
      if (token) {
        try {
          const user = jwt.verify(token, process.env.JWT_SECRET || 'rahasia_cbijak_jwt_key_2026');
          const permissions = await getEffectivePermissions(user.id);
          allowed = user.id === document.ownerId
            || user.divisi_id === document.divisionId
            || permissions.includes('dokumen.kelola')
            || permissions.includes('akses_dokumen_sensitif');
        } catch {
          allowed = false;
        }
      }
    }
    if (!allowed) return res.status(403).json({ success: false, message: 'Dokumen memerlukan autentikasi.' });

    const filePath = path.join(uploadDirectory, document.storedFileName);
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, message: 'File tidak ditemukan.' });
    return res.sendFile(filePath, {
      headers: {
        'Content-Disposition': `inline; filename="${document.fileName.replace(/"/g, '')}"`,
      },
    });
  } catch (error) {
    console.error('Error menyajikan file dokumen:', error);
    return res.status(500).json({ success: false, message: 'Gagal membuka file dokumen.' });
  }
});

module.exports = router;
