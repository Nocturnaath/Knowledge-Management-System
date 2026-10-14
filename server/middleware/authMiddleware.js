const jwt = require('jsonwebtoken');

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

module.exports = { verifyToken };