const express = require('express');
const fs = require('fs');
const path = require('path');
const WordExtractor = require('word-extractor');
const mammoth = require('mammoth');
const XLSX = require('xlsx');
const { PDFParse } = require('pdf-parse');
const db = require('../config/db');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();
const uploadDirectory = path.join(__dirname, '..', 'uploads', 'documents');

async function extractText(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  try {
    if (extension === '.doc') {
      const extractor = new WordExtractor();
      return (await extractor.extract(filePath)).getBody() || '';
    }
    if (extension === '.docx') {
      return (await mammoth.extractRawText({ path: filePath })).value || '';
    }
    if (extension === '.xls' || extension === '.xlsx') {
      const workbook = XLSX.readFile(filePath);
      return workbook.SheetNames.map((name) => {
        return `${name}\n${XLSX.utils.sheet_to_csv(workbook.Sheets[name])}`;
      }).join('\n');
    }
    if (extension === '.pdf') {
      const parser = new PDFParse({ data: new Uint8Array(fs.readFileSync(filePath)) });
      try {
        return (await parser.getText()).text || '';
      } finally {
        await parser.destroy();
      }
    }
  } catch (error) {
    console.warn(`Teks dokumen tidak dapat diekstrak (${path.basename(filePath)}):`, error.message);
  }
  return '';
}

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
              d.extracted_text AS extractedText,
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

    await Promise.all(dokumen.map(async (document) => {
      if (document.extractedText) return;
      const filePath = path.join(uploadDirectory, document.storedFileName);
      if (!fs.existsSync(filePath)) return;
      document.extractedText = await extractText(filePath);
      await db.query('UPDATE documents SET extracted_text = ? WHERE id = ?', [
        document.extractedText.slice(0, 2 * 1024 * 1024),
        document.id,
      ]);
    }));

    res.json({ success: true, kategori: namaKategori, dokumen });
  } catch (error) {
    console.error('Error memuat informasi umum:', error);
    res.status(500).json({ success: false, message: 'Gagal memuat informasi umum.' });
  }
});

module.exports = router;