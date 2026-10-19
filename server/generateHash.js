const bcrypt = require('bcryptjs');

const daftarAkun = [
  { username: 'ryomen.super', passwordAsli: 'ryo123' },
  { username: 'mahito.admin', passwordAsli: 'to123' },
  { username: 'gojo.keu', passwordAsli: 'gojo123' },
  { username: 'nanami.it', passwordAsli: 'nami123' }
];

async function generateSemuaHash() {
  console.log('--- DAFTAR HASH PASSWORD UNTUK DATABASE ---');
  for (const akun of daftarAkun) {
    const hashedPassword = await bcrypt.hash(akun.passwordAsli, 10);
    console.log(`\nUsername: ${akun.username}`);
    console.log(`Password Asli: ${akun.passwordAsli}`);
    console.log(`Hash untuk Database: ${hashedPassword}`);
  }
}

generateSemuaHash();