import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function fixAdmin() {
  const dbUrl = process.env.DATABASE_URL || '(não definido)';
  console.log('DATABASE_URL:', dbUrl);

  const count = await prisma.user.count();
  console.log('Total de usuários encontrados:', count);

  const users = await prisma.user.findMany({ select: { email: true, name: true, active: true, role: true } });
  console.log('Usuários:', users);

  const hash = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@cantina.com' },
    update: { password: hash, active: true, role: 'ADMIN' },
    create: {
      name: 'Administrador',
      email: 'admin@cantina.com',
      password: hash,
      role: 'ADMIN',
      active: true,
    },
  });

  console.log('\n✅ Admin garantido:', admin.email, '| Senha: admin123');
}

fixAdmin()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
