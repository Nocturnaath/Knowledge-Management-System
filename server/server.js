const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Koneksi Database
const db = require('./config/db');

// Rute
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Sambungkan rute auth
app.use('/api/auth', authRoutes);

// Rute tes utama
app.get('/', (req, res) => {
  res.send('Server C-BIJAK berjalan dengan lancar!');
});

// Jalankan server
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});

// Rute uji coba awal
app.get('/', (req, res) => {
  res.send('Server C-BIJAK berjalan dengan lancar!');
});

// Jalanin server
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});