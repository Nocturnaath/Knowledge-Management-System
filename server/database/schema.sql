-- Skrip database C-BIJAK (cbijak_db)
-- Jalankan dari awal hanya saat isinya masih data uji coba.

-- 0. Hapus tabel lama (urutan penting: users bergantung pada divisi)
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
    description TEXT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    public_access BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

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