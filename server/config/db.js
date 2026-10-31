const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'cbijak_db',
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 5000,
  queueLimit: 10
});

pool.documentVersionTableReady = pool.query(`
  CREATE TABLE IF NOT EXISTS document_versions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    document_id INT NOT NULL,
    version_number INT NOT NULL,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    stored_file_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    event_type ENUM('upload', 'update') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY document_version_number (document_id, version_number)
  )
`).then(async () => {
  await pool.query(`
    INSERT INTO document_versions
      (document_id, version_number, user_id, title, file_name, stored_file_name, category, description, event_type, created_at)
    SELECT d.id, 1, d.user_id, d.title, d.file_name, d.stored_file_name, d.category, d.description, 'upload', d.created_at
    FROM documents d
    WHERE NOT EXISTS (
      SELECT 1 FROM document_versions v WHERE v.document_id = d.id
    )
  `);
}).catch((error) => {
  console.error('Gagal menyiapkan tabel versi dokumen:', error.message);
  throw error;
});

// Tes koneksi database
pool.getConnection()
  .then(conn => {
    console.log('✅ Berhasil terhubung ke database MySQL (cbijak_db)!');
    conn.release();
  })
  .catch(err => {
    console.error('❌ Gagal terhubung ke database:', err.message);
  });

module.exports = pool;