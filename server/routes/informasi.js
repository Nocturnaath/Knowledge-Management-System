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
const publicRouter = express.Router();
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
        return String((await parser.getText()).text || '')
          .replace(/\u0000/g, '')
          .replace(/[ \t]+\n/g, '\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
      } finally {
        await parser.destroy();
      }
    }
  } catch (error) {
    console.warn(`Teks dokumen tidak dapat diekstrak (${path.basename(filePath)}):`, error.message);
  }
  return '';
}

// Halaman internal mempertahankan seluruh tab kategori Informasi Umum.
router.get('/', verifyToken, async (req, res) => {
  try {
    const [kategori] = await db.query(
      `SELECT name FROM categories
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
              d.created_at AS tanggal,
              u.nama_lengkap AS pengunggah
       FROM documents d
       JOIN categories c ON c.name = d.category AND c.category_type = 'informasi'
       JOIN users u ON u.id = d.user_id
       WHERE d.status = 'approved'
       ORDER BY d.created_at DESC`,
    );
    res.json({
      success: true,
      kategori: namaKategori,
      dokumen,
    });
  } catch (error) {
    console.error('Error memuat informasi umum:', error);
    res.status(500).json({ success: false, message: 'Gagal memuat informasi umum.' });
  }
});

// Landing page: hanya dokumen final yang memiliki flag publik.
publicRouter.get('/', async (req, res) => {
  try {
    const [kategori] = await db.query(
      `SELECT DISTINCT d.category AS name
       FROM documents d
       WHERE d.status = 'approved'
         AND d.is_public = TRUE
         AND d.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       ORDER BY d.category`,
    );
    const namaKategori = kategori.map((item) => item.name);
    const [dokumen] = await db.query(
      `SELECT d.id, d.title AS judul, d.description AS deskripsi,
              d.category AS kategori, d.file_name AS fileName, d.created_at AS tanggal,
              u.nama_lengkap AS pengunggah
       FROM documents d
       JOIN users u ON u.id = d.user_id
       WHERE d.status = 'approved'
         AND d.is_public = TRUE
         AND d.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       ORDER BY d.created_at DESC`,
    );
    res.json({
      success: true,
      kategori: namaKategori,
      dokumen: dokumen.map((document) => ({
        ...document,
        fileUrl: `/document-files/${document.id}`,
      })),
    });
  } catch (error) {
    console.error('Error memuat informasi umum:', error);
    res.status(500).json({ success: false, message: 'Gagal memuat informasi umum.' });
  }
});

module.exports = { router, publicRouter };