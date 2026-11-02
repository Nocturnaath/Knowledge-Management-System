CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    category_type ENUM('aplikasi', 'informasi') NOT NULL DEFAULT 'aplikasi',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO categories (name, category_type) VALUES
('Overview', 'aplikasi'), ('Business Process', 'aplikasi'),
('Application Architecture', 'aplikasi'), ('Data Model', 'aplikasi'),
('API & Integration', 'aplikasi'), ('Infrastructure & Deployment', 'aplikasi'),
('User Guide', 'aplikasi'), ('Administration Guide', 'aplikasi'),
('Troubleshooting', 'aplikasi'), ('Changelog', 'aplikasi'),
('Notulensi', 'informasi'), ('Memorandum', 'informasi'), ('RAB', 'informasi'),
('Evidence Harian', 'informasi'), ('Manajemen Risiko SPI', 'informasi');
