require('dotenv').config(); // Load environment variables from .env
const bcrypt = require('bcryptjs');
const prisma = require('../api/db');

async function main() {
  const defaultPassword = 'MraGlc2026!';
  console.log('Memulai proses enkripsi password user...');

  try {
    // Ambil semua user dari m_user
    const users = await prisma.m_user.findMany();
    console.log(`Menemukan ${users.length} akun user di database.`);

    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    let updatedCount = 0;

    for (const user of users) {
      if (!user.email) {
        console.log(`User ID ${user.id} (${user.full_name}) tidak memiliki email. Dilewati.`);
        continue;
      }

      // Update password dengan hashed password default
      await prisma.m_user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          is_active: true // Pastikan user aktif agar bisa dicoba untuk login
        }
      });
      console.log(`Akun Ter-update: ${user.full_name} (${user.email})`);
      updatedCount++;
    }

    console.log('\n======================================================');
    console.log(`Sukses! ${updatedCount} akun user berhasil di-update.`);
    console.log(`Semua akun menggunakan password default: ${defaultPassword}`);
    console.log('======================================================\n');

  } catch (err) {
    console.error('Proses update password gagal:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
