require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('../api/db');

async function main() {
  const email = 'aris@mraretail.co.id';
  const password = 'Kmzway87aa!!';
  const fullName = 'Aris';

  console.log(`Checking if user ${email} exists in the database...`);

  try {
    const existingUser = await prisma.m_user.findUnique({
      where: { email }
    });

    const hashedPassword = await bcrypt.hash(password, 10);

    if (existingUser) {
      console.log(`User found. Updating password and ensuring user is active...`);
      const updated = await prisma.m_user.update({
        where: { email },
        data: {
          password: hashedPassword,
          is_active: true,
          role: existingUser.role || 'admin'
        }
      });
      console.log(`Successfully updated user: ${updated.full_name} (${updated.email})`);
    } else {
      console.log(`User not found. Creating a new user account...`);
      const created = await prisma.m_user.create({
        data: {
          email,
          password: hashedPassword,
          full_name: fullName,
          role: 'admin',
          is_active: true,
          department: 'IT / GA',
          position: 'Administrator'
        }
      });
      console.log(`Successfully created user: ${created.full_name} (${created.email}) with ID: ${created.id}`);
    }
  } catch (err) {
    console.error('Error creating/updating user:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
