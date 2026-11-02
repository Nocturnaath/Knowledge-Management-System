const jwt = require('jsonwebtoken');
const db = require('../config/db');

async function getEffectivePermissions(userId, role) {
  await db.authorizationTablesReady;
  const [permissions] = await db.query('SELECT perm_key FROM permissions');
  if (role === 'super_admin') return permissions.map((permission) => permission.perm_key);

  const [rolePermissions] = await db.query(
    'SELECT perm_key FROM role_permissions WHERE role = ?',
    [role],
  );
  const [overrides] = await db.query(
    'SELECT perm_key, allowed FROM user_permission_overrides WHERE user_id = ?',
    [userId],
  );
  const effective = new Set(rolePermissions.map((permission) => permission.perm_key));
  overrides.forEach((override) => {
    if (override.allowed) effective.add(override.perm_key);
    else effective.delete(override.perm_key);
  });
  return [...effective];
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

module.exports = { verifyToken, getEffectivePermissions };