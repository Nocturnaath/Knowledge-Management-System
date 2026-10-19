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