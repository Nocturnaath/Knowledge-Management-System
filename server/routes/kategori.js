const express = require('express');
const db = require('../config/db');
const { verifyToken, getEffectivePermissions } = require('../middleware/authMiddleware');

const router = express.Router();

async function requireCategoryManager(req, res, next) {
  try {
    const permissions = await getEffectivePermissions(req.user.id, req.user.role);
    if (!permissions.includes('kelola_kategori')) {
      return res.status(403).json({ success: false, message: 'Anda tidak memiliki akses untuk mengelola kategori.' });
    }
    return next();
  } catch (error) {
    console.error('Error memeriksa hak akses kategori:', error);
    return res.status(500).json({ success: false, message: 'Gagal memeriksa hak akses.' });
  }
}

router.get('/', verifyToken, async (req, res) => {
  try {
    const [categories] = await db.query(
      `SELECT c.id, c.name, c.category_type AS categoryType, c.created_at AS createdAt,
              COUNT(d.id) AS documentCount
       FROM categories c
       LEFT JOIN documents d ON d.category = c.name
       GROUP BY c.id, c.name, c.created_at
       ORDER BY c.name ASC`,
    );
    res.json({ success: true, categories });
  } catch (error) {
    console.error('Error memuat kategori:', error);
    res.status(500).json({ success: false, message: 'Gagal memuat kategori.' });
  }
});

router.post('/', verifyToken, requireCategoryManager, async (req, res) => {
  const name = req.body.name?.trim();
  const categoryType = req.body.categoryType;
  if (!name) {
    return res.status(400).json({ success: false, message: 'Nama kategori wajib diisi.' });
  }
  if (name.length > 100) {
    return res.status(400).json({ success: false, message: 'Nama kategori maksimal 100 karakter.' });
  }
  if (!['aplikasi', 'informasi'].includes(categoryType)) {
    return res.status(400).json({ success: false, message: 'Tipe kategori tidak valid.' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO categories (name, category_type) VALUES (?, ?)',
      [name, categoryType],
    );
    res.status(201).json({
      success: true,
      category: { id: result.insertId, name, categoryType, documentCount: 0 },
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Kategori tersebut sudah ada.' });
    }
    console.error('Error menambah kategori:', error);
    res.status(500).json({ success: false, message: 'Gagal menambah kategori.' });
  }
});

router.put('/:id', verifyToken, requireCategoryManager, async (req, res) => {
  const name = req.body.name?.trim();
  if (!name) {
    return res.status(400).json({ success: false, message: 'Nama kategori wajib diisi.' });
  }
  if (name.length > 100) {
    return res.status(400).json({ success: false, message: 'Nama kategori maksimal 100 karakter.' });
  }

  try {
    const [current] = await db.query('SELECT name FROM categories WHERE id = ?', [req.params.id]);
    if (current.length === 0) {
      return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan.' });
    }
    const [result] = await db.query('UPDATE categories SET name = ? WHERE id = ?', [name, req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan.' });
    }
    await db.query('UPDATE documents SET category = ? WHERE category = ?', [name, current[0].name]);
    await db.query('UPDATE document_versions SET category = ? WHERE category = ?', [name, current[0].name]);
    res.json({ success: true, category: { id: Number(req.params.id), name } });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Kategori tersebut sudah ada.' });
    }
    console.error('Error mengubah kategori:', error);
    res.status(500).json({ success: false, message: 'Gagal mengubah kategori.' });
  }
});

router.delete('/:id', verifyToken, requireCategoryManager, async (req, res) => {
  const targetCategoryId = Number(req.body.targetCategoryId);
  try {
    const [categories] = await db.query(
      `SELECT c.id, c.name, c.category_type AS categoryType, COUNT(d.id) AS documentCount
       FROM categories c
       LEFT JOIN documents d ON d.category = c.name
       WHERE c.id = ?
       GROUP BY c.id, c.name`,
      [req.params.id],
    );
    if (categories.length === 0) {
      return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan.' });
    }
    const source = categories[0];
    const documentCount = Number(source.documentCount);
    if (documentCount > 0 && !Number.isInteger(targetCategoryId)) {
      return res.status(400).json({ success: false, message: 'Kategori tujuan wajib dipilih.' });
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      let target = null;
      if (documentCount > 0) {
        const [targetRows] = await connection.query(
          'SELECT id, name, category_type AS categoryType FROM categories WHERE id = ?',
          [targetCategoryId],
        );
        target = targetRows[0];
        if (!target) {
          await connection.rollback();
          return res.status(404).json({ success: false, message: 'Kategori tujuan tidak ditemukan.' });
        }
        if (target.id === source.id || target.categoryType !== source.categoryType) {
          await connection.rollback();
          return res.status(400).json({ success: false, message: 'Kategori tujuan harus sejenis dan berbeda dari kategori asal.' });
        }
        await connection.query('UPDATE documents SET category = ? WHERE category = ?', [target.name, source.name]);
        await connection.query('UPDATE document_versions SET category = ? WHERE category = ?', [target.name, source.name]);
        await connection.query(
          `INSERT INTO category_activity_logs
            (actor_id, source_category, target_category, document_count)
           VALUES (?, ?, ?, ?)`,
          [req.user.id, source.name, target.name, documentCount],
        );
      }
      await connection.query('DELETE FROM categories WHERE id = ?', [source.id]);
      await connection.commit();
      return res.json({
        success: true,
        message: documentCount > 0
          ? `${documentCount} dokumen dipindahkan lalu kategori dihapus.`
          : 'Kategori berhasil dihapus.',
      });
    } catch (transactionError) {
      await connection.rollback();
      throw transactionError;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error menghapus kategori:', error);
    res.status(500).json({ success: false, message: 'Gagal menghapus kategori.' });
  }
});

module.exports = router;
