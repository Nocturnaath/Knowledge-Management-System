const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'cbijak_db',
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 10000,
  queueLimit: 10
});

async function initDatabase() {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Berhasil terhubung ke database MySQL (cbijak_db)!');
    conn.release();

    // 1. Buat tabel master divisi terlebih dahulu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS divisi (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama_divisi VARCHAR(100) NOT NULL,
        kode_divisi VARCHAR(20) NOT NULL UNIQUE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 2. Buat tabel rumpun
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rumpun (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama_rumpun VARCHAR(50) NOT NULL UNIQUE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 3. Buat tabel applications (bergantung pada rumpun & divisi)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama_aplikasi VARCHAR(100) NOT NULL UNIQUE,
        rumpun_id INT NOT NULL,
        divisi_id INT NULL,
        status VARCHAR(100) NOT NULL DEFAULT 'Aktif',
        komponen_terisi TINYINT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (rumpun_id) REFERENCES rumpun(id),
        FOREIGN KEY (divisi_id) REFERENCES divisi(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 4. Buat tabel users
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sso_id VARCHAR(50) NOT NULL UNIQUE,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        nama_lengkap VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE,
        jabatan VARCHAR(100) NULL,
        divisi_id INT NULL,
        role ENUM('super_admin', 'admin', 'staff_it', 'staff_divisi') NOT NULL DEFAULT 'staff_divisi',
        foto_url VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (divisi_id) REFERENCES divisi(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 5. Buat tabel documents
    await pool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        stored_file_name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        application VARCHAR(100) NULL,
        tags TEXT NULL,
        description TEXT NOT NULL,
        status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
        public_access BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    try {
      await pool.query('ALTER TABLE documents ADD COLUMN tags TEXT NULL');
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') throw error;
    }

    // 6. Buat tabel kategori dokumen
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        category_type ENUM('aplikasi', 'informasi') NOT NULL DEFAULT 'aplikasi',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    try {
      await pool.query(
        `ALTER TABLE categories
         ADD COLUMN category_type ENUM('aplikasi', 'informasi') NOT NULL DEFAULT 'aplikasi'`,
      );
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') throw error;
    }

    await pool.query(`
      INSERT IGNORE INTO categories (name, category_type) VALUES
      ('Overview', 'aplikasi'), ('Business Process', 'aplikasi'),
      ('Application Architecture', 'aplikasi'), ('Data Model', 'aplikasi'),
      ('API & Integration', 'aplikasi'), ('Infrastructure & Deployment', 'aplikasi'),
      ('User Guide', 'aplikasi'), ('Administration Guide', 'aplikasi'),
      ('Troubleshooting', 'aplikasi'), ('Changelog', 'aplikasi'),
      ('Notulensi', 'informasi'), ('Memorandum', 'informasi'), ('RAB', 'informasi'),
      ('Evidence Harian', 'informasi'), ('Manajemen Risiko SPI', 'informasi')
    `);
    await pool.query(
      `UPDATE categories SET category_type = 'informasi'
       WHERE name IN ('Notulensi', 'Memorandum', 'RAB', 'Evidence Harian', 'Manajemen Risiko SPI', 'Serba-serbi')`,
    );

    // 7. Buat tabel document_versions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS document_versions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        document_id INT NOT NULL,
        version_number INT NOT NULL,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        stored_file_name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        tags TEXT NULL,
        description TEXT NOT NULL,
        event_type ENUM('upload', 'update') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY document_version_number (document_id, version_number)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    try {
      await pool.query('ALTER TABLE document_versions ADD COLUMN tags TEXT NULL');
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') throw error;
    }

    // 7. Buat tabel permissions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        perm_key VARCHAR(50) PRIMARY KEY,
        label VARCHAR(100) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 8. Buat tabel role_permissions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role ENUM('super_admin', 'admin', 'staff_it', 'staff_divisi') NOT NULL,
        perm_key VARCHAR(50) NOT NULL,
        PRIMARY KEY (role, perm_key),
        FOREIGN KEY (perm_key) REFERENCES permissions(perm_key) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 9. Buat tabel user_permission_overrides
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_permission_overrides (
        user_id INT NOT NULL,
        perm_key VARCHAR(50) NOT NULL,
        allowed BOOLEAN NOT NULL,
        PRIMARY KEY (user_id, perm_key),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (perm_key) REFERENCES permissions(perm_key) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 10. Buat tabel document_approval_logs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS document_approval_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        document_id INT NOT NULL,
        actor_id INT NOT NULL,
        action ENUM('approved', 'rejected', 'forwarded') NOT NULL,
        note TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
        FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS category_activity_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        actor_id INT NOT NULL,
        source_category VARCHAR(100) NOT NULL,
        target_category VARCHAR(100) NOT NULL,
        document_count INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // --- INSERT DATA AWAL (SEEDERS) ---

    // Data Divisi
    await pool.query(`
      INSERT IGNORE INTO divisi (id, nama_divisi, kode_divisi) VALUES
      (1, 'Divisi Manajemen Aset & Sistem Informasi', 'SI'),
      (2, 'Divisi Keuangan', 'KEU'),
      (3, 'Divisi Administrasi Umum', 'UMUM'),
      (4, 'Divisi Operasional & Pemasaran', 'OPS')
    `);

    // Data Rumpun
    await pool.query(`
      INSERT IGNORE INTO rumpun (id, nama_rumpun) VALUES
      (1, 'Internal Pegawai'), 
      (2, 'Operasional Bisnis'), 
      (3, 'Keuangan'), 
      (4, 'Tata Kelola')
    `);

    // Data Applications
    await pool.query(`
      INSERT IGNORE INTO applications (nama_aplikasi, rumpun_id, divisi_id, status, komponen_terisi) VALUES
      ('Absen Online', 1, 3, 'Aktif, Maintenance, Pengembangan', 9),
      ('C-Loga', 1, 3, 'Aktif, Maintenance, Pengembangan', 0),
      ('C-Skip', 1, 3, 'Aktif, Maintenance, Pengembangan', 0),
      ('HCIS', 1, 3, 'Aktif, Maintenance, Pengembangan', 0),
      ('Arsip PPKK', 1, 3, 'Aktif', 0),
      ('Synology', 1, 3, 'Aktif', 0),
      ('Zimbra', 1, 3, 'Aktif', 10),
      ('Rekrutmen', 1, 3, 'Aktif', 0),
      ('C-Mantap (Internal)', 2, 1, 'Aktif, Maintenance, Pengembangan', 10),
      ('C-Mantap Publik', 2, 1, 'Aktif', 0),
      ('C-Milan (Lahan)', 2, 1, 'Aktif', 0),
      ('SIK', 2, 1, 'Aktif, Maintenance, Pengembangan', 0),
      ('C-Nergi', 2, 1, 'Aktif', 0),
      ('C-Mark', 3, 2, 'Aktif', 10),
      ('C-Baja', 3, 2, 'Aktif', 0),
      ('C-Dian', 3, 2, 'Aktif', 0),
      ('C-UP', 3, 2, 'Maintenance, Pengembangan', 0),
      ('Website', 4, 1, 'Aktif, Maintenance, Pengembangan', 0),
      ('C-Cleo', 4, 1, 'Aktif, Maintenance, Pengembangan', 5),
      ('C-TADEL', 4, 1, 'Aktif, Maintenance, Pengembangan', 0),
      ('C-SPI', 4, 1, 'Aktif', 0),
      ('IT Support', 4, 1, 'Aktif, Maintenance, Pengembangan', 0),
      ('Dashboard PPKK', 4, 1, 'Aktif, Maintenance, Pengembangan', 0),
      ('Webservice PPKK', 4, 1, 'Aktif, Maintenance, Pengembangan', 0)
    `);

    // Data Permissions & Users
    await pool.query(`
      INSERT IGNORE INTO permissions (perm_key, label) VALUES
      ('unggah_dokumen', 'Unggah Dokumen'),
      ('kelola_kategori', 'Kelola Kategori'),
      ('kelola_aplikasi', 'Kelola Aplikasi'),
      ('akses_dokumen_sensitif', 'Akses Dokumen Sensitif'),
      ('review_dokumen', 'Review Dokumen'),
      ('acc_final', 'ACC Final'),
      ('kelola_hak_akses', 'Kelola Hak Akses')
    `);

    await pool.query(`
      INSERT IGNORE INTO role_permissions (role, perm_key)
      SELECT 'super_admin', perm_key FROM permissions
    `);

    await pool.query(`
      INSERT IGNORE INTO role_permissions (role, perm_key) VALUES
      ('admin', 'review_dokumen'),
      ('admin', 'unggah_dokumen'),
      ('staff_it', 'unggah_dokumen'),
      ('staff_divisi', 'unggah_dokumen')
    `);

    await pool.query(`
      INSERT IGNORE INTO users (id, sso_id, username, password, nama_lengkap, email, divisi_id, role) VALUES
      (1, 'SSO001', 'ryomen.super', '$2b$10$JfakwP3PZ.Xqkex0CiJ9V.NKsPPJqSeyuShqsj.k5cntUuSFeWmG.', 'Ryomen Sukuna', 'ryomen@cbijak.local', 1, 'super_admin'),
      (2, 'SSO002', 'mahito.admin', '$2b$10$yN8e.bfqnxGGgdOILN3AU.BB3qaYcUz62MZsypsQn.5N3wJVX6.5i', 'Mahito', 'mahito@cbijak.local', 1, 'admin'),
      (3, 'SSO003', 'nanami.it', '$2b$10$cYS62rcrhHjbLNhUC2PaFuCToCYWpqlj8tLcpx.rlm28xshHofTWy', 'Kento Nanami', 'nami@cbijak.local', 1, 'staff_it'),
      (4, 'SSO004', 'gojo.keu', '$2b$10$EbqG.i8VeGOds.MzDAHXUOSIJHmoS9ldpU8ELdwkeLa/.qG82LKgC', 'Satoru Gojo', 'gojo@cbijak.local', 2, 'staff_divisi')
    `);

    console.log('✅ Inisialisasi database C-BIJAK (divisi, rumpun, aplikasi, & users) berhasil disiapkan!');
  } catch (error) {
    console.error('❌ Gagal menyiapkan database:', error.message);
  }
}

initDatabase();

module.exports = pool;