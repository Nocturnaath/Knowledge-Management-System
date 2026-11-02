CREATE TABLE IF NOT EXISTS permissions (
    perm_key VARCHAR(50) PRIMARY KEY,
    label VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role ENUM('super_admin', 'admin', 'staff_it', 'staff_divisi') NOT NULL,
    perm_key VARCHAR(50) NOT NULL,
    PRIMARY KEY (role, perm_key),
    FOREIGN KEY (perm_key) REFERENCES permissions(perm_key) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_permission_overrides (
    user_id INT NOT NULL,
    perm_key VARCHAR(50) NOT NULL,
    allowed BOOLEAN NOT NULL,
    PRIMARY KEY (user_id, perm_key),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (perm_key) REFERENCES permissions(perm_key) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS document_approval_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    document_id INT NOT NULL,
    actor_id INT NOT NULL,
    action ENUM('approved', 'rejected', 'forwarded') NOT NULL,
    note TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT IGNORE INTO permissions (perm_key, label) VALUES
('unggah_dokumen', 'Unggah Dokumen'),
('kelola_kategori', 'Kelola Kategori'),
('kelola_aplikasi', 'Kelola Aplikasi'),
('akses_dokumen_sensitif', 'Akses Dokumen Sensitif'),
('review_dokumen', 'Review Dokumen'),
('acc_final', 'ACC Final'),
('kelola_hak_akses', 'Kelola Hak Akses');

INSERT IGNORE INTO role_permissions (role, perm_key)
SELECT 'super_admin', perm_key FROM permissions;

INSERT IGNORE INTO role_permissions (role, perm_key) VALUES
('admin', 'review_dokumen'),
('admin', 'unggah_dokumen'),
('staff_it', 'unggah_dokumen'),
('staff_divisi', 'unggah_dokumen');
