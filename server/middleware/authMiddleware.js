const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { mergeEffectivePermissions } = require('../utils/authorization');

async function getEffectivePermissions(userId) {
  await db.authorizationTablesReady;
  const [rolePermissions] = await db.query(
    `SELECT DISTINCT rp.perm_key
     FROM user_roles ur
     JOIN role_permissions rp ON rp.role_id = ur.role_id
     WHERE ur.user_id = ?`,
    [userId],
  );
  const [overrides] = await db.query(
    'SELECT perm_key, allowed FROM user_permissions WHERE user_id = ?',
    [userId],
  );
  return mergeEffectivePermissions(
    rolePermissions.map((permission) => permission.perm_key),
    overrides,
  );
}

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer <TOKEN>

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Akses ditolak. Silakan login terlebih dahulu.' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'rahasia_cbijak_jwt_key_2026');
    req.user = decoded; // Menyimpan data { id, role, divisi_id, username }
    next();
  } catch (err) {
    return res.status(403).json({ 
      success: false, 
      message: 'Sesi login tidak valid atau sudah kedaluwarsa.' 
    });
  }
};

function requirePermission(permission) {
  return async (req, res, next) => {
    try {
      const permissions = await getEffectivePermissions(req.user.id);
      if (!permissions.includes(permission)) {
        return res.status(403).json({
          success: false,
          message: 'Anda tidak memiliki izin untuk melakukan tindakan ini.',
        });
      }
      req.permissions = new Set(permissions);
      return next();
    } catch (error) {
      console.error(`Error memeriksa izin ${permission}:`, error);
      return res.status(500).json({ success: false, message: 'Gagal memeriksa hak akses.' });
    }
  };
}

module.exports = { verifyToken, getEffectivePermissions, requirePermission };