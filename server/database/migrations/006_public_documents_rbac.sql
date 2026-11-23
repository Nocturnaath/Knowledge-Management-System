-- Public documents and RBAC migration for existing installations.
ALTER TABLE documents
  ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

RENAME TABLE role_permissions TO role_permissions_legacy;

CREATE TABLE role_permissions (
  role_id INT NOT NULL,
  perm_key VARCHAR(50) NOT NULL,
  PRIMARY KEY (role_id, perm_key),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (perm_key) REFERENCES permissions(perm_key) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE user_roles (
  user_id INT NOT NULL,
  role_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE user_permissions (
  user_id INT NOT NULL,
  perm_key VARCHAR(50) NOT NULL,
  allowed BOOLEAN NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, perm_key),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (perm_key) REFERENCES permissions(perm_key) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--bagian untuk menyesuaikan dengan role yang sudah ada di tabel users--
INSERT IGNORE INTO roles (name, slug, is_system) VALUES
  ('Super Admin', 'super_admin', TRUE),
  ('Admin', 'admin', TRUE),
  ('Staf IT', 'staff_it', TRUE),
  ('Staf Divisi', 'staff_divisi', TRUE);

INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u JOIN roles r ON r.slug = u.role;

INSERT IGNORE INTO user_permissions (user_id, perm_key, allowed)
SELECT user_id, perm_key, allowed FROM user_permission_overrides;
