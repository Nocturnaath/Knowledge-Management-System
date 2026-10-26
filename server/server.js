const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

// Koneksi Database
const db = require('./config/db');

// Rute
const authRoutes = require('./routes/auth');
const aplikasiRoutes = require('./routes/aplikasi');
const hakAksesRoutes = require('./routes/hakakses');
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Foto profil yang diunggah dapat diakses lewat /uploads/<nama-file>
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/aplikasi', aplikasiRoutes);
app.use('/api/hak-akses', hakAksesRoutes); // Rute ini untuk super_admin, middleware ada di routes/hakakses.js

// Sambung rute auth
app.use('/api/auth', authRoutes);

// Rute tes utama
app.get('/', (req, res) => {
  res.send('Server C-BIJAK berjalan dengan lancar!');
});

// Penangan error (mis. foto > 2MB) agar balasan tetap berbentuk JSON
app.use((err, req, res, next) => {
  const message = err.code === 'LIMIT_FILE_SIZE' ? 'Ukuran foto maksimal 2MB.' : err.message;
  res.status(400).json({ success: false, message });
});

// Jalankan server
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});