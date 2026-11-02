-- Skrip database C-BIJAK (cbijak_db)
-- Jalankan dari awal hanya saat isinya masih data uji coba.

-- 0. Hapus tabel lama (urutan penting: users bergantung pada divisi)
DROP TABLE IF EXISTS document_approval_logs;
DROP TABLE IF EXISTS user_permission_overrides;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS divisi;

-- 1. Buat tabel divisi
CREATE TABLE divisi (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama_divisi VARCHAR(100) NOT NULL,
    kode_divisi VARCHAR(20) NOT NULL UNIQUE
);

-- 2. Buat tabel users (tanpa kolom jabatan)
CREATE TABLE users (
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
);

CREATE TABLE documents (
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
);

CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    category_type ENUM('aplikasi', 'informasi') NOT NULL DEFAULT 'aplikasi',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE document_versions (
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
);

INSERT INTO categories (name, category_type) VALUES
('Overview', 'aplikasi'), ('Business Process', 'aplikasi'),
('Application Architecture', 'aplikasi'), ('Data Model', 'aplikasi'),
('API & Integration', 'aplikasi'), ('Infrastructure & Deployment', 'aplikasi'),
('User Guide', 'aplikasi'), ('Administration Guide', 'aplikasi'),
('Troubleshooting', 'aplikasi'), ('Changelog', 'aplikasi'),
('Notulensi', 'informasi'), ('Memorandum', 'informasi'), ('RAB', 'informasi'),
('Evidence Harian', 'informasi'), ('Manajemen Risiko SPI', 'informasi');

CREATE TABLE permissions (
    perm_key VARCHAR(50) PRIMARY KEY,
    label VARCHAR(100) NOT NULL
);

CREATE TABLE role_permissions (
    role ENUM('super_admin', 'admin', 'staff_it', 'staff_divisi') NOT NULL,
    perm_key VARCHAR(50) NOT NULL,
    PRIMARY KEY (role, perm_key),
    FOREIGN KEY (perm_key) REFERENCES permissions(perm_key) ON DELETE CASCADE
);

CREATE TABLE user_permission_overrides (
    user_id INT NOT NULL,
    perm_key VARCHAR(50) NOT NULL,
    allowed BOOLEAN NOT NULL,
    PRIMARY KEY (user_id, perm_key),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (perm_key) REFERENCES permissions(perm_key) ON DELETE CASCADE
);

CREATE TABLE document_approval_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    document_id INT NOT NULL,
    actor_id INT NOT NULL,
    action ENUM('approved', 'rejected', 'forwarded') NOT NULL,
    note TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO permissions (perm_key, label) VALUES
('unggah_dokumen', 'Unggah Dokumen'),
('kelola_kategori', 'Kelola Kategori'),
('kelola_aplikasi', 'Kelola Aplikasi'),
('akses_dokumen_sensitif', 'Akses Dokumen Sensitif'),
('review_dokumen', 'Review Dokumen'),
('acc_final', 'ACC Final'),
('kelola_hak_akses', 'Kelola Hak Akses');

INSERT INTO role_permissions (role, perm_key)
SELECT 'super_admin', perm_key FROM permissions;

INSERT INTO role_permissions (role, perm_key) VALUES
('admin', 'review_dokumen'),
('admin', 'unggah_dokumen'),
('staff_it', 'unggah_dokumen'),
('staff_divisi', 'unggah_dokumen');

-- 3. Masukkan data divisi awal
INSERT INTO divisi (nama_divisi, kode_divisi) VALUES
('Divisi Manajemen Aset & Sistem Informasi', 'SI'),
('Divisi Keuangan', 'KEU'),
('Divisi Administrasi Umum', 'UMUM'),
('Divisi Operasional & Pemasaran', 'OPS');

-- 4. Masukkan akun uji coba awal
-- Kata sandi: ryomen.super = ryo123, mahito.admin = to123, nanami.it = nami123, gojo.keu = gojo123
INSERT INTO users (sso_id, username, password, nama_lengkap, email, divisi_id, role) VALUES
('SSO001', 'ryomen.super', '$2b$10$JfakwP3PZ.Xqkex0CiJ9V.NKsPPJqSeyuShqsj.k5cntUuSFeWmG.', 'Ryomen Sukuna', 'ryomen@cbijak.local', 1, 'super_admin'),
('SSO002', 'mahito.admin', '$2b$10$yN8e.bfqnxGGgdOILN3AU.BB3qaYcUz62MZsypsQn.5N3wJVX6.5i', 'Mahito', 'mahito@cbijak.local', 1, 'admin'),
('SSO003', 'nanami.it', '$2b$10$cYS62rcrhHjbLNhUC2PaFuCToCYWpqlj8tLcpx.rlm28xshHofTWy', 'Kento Nanami', 'nami@cbijak.local', 1, 'staff_it'),
('SSO004', 'gojo.keu', '$2b$10$EbqG.i8VeGOds.MzDAHXUOSIJHmoS9ldpU8ELdwkeLa/.qG82LKgC', 'Satoru Gojo', 'gojo@cbijak.local', 2, 'staff_divisi');