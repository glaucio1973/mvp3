import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function fixAdmin() {
  const dbUrl = process.env.DATABASE_URL || '(não definido)';
  console.log('DATABASE_URL:', dbUrl);

  // Create cantina@cantina.com admin
  const senha = 'cantina123';
  const hash = await bcrypt.hash(senha, 10);

  // Verify bcrypt is working
  const ok = await bcrypt.compare(senha, hash);
  console.log('Teste bcrypt:', ok ? '✅ OK' : '❌ FALHOU');

  const cantina = await prisma.user.upsert({
    where: { email: 'cantina@cantina.com' },
    update: { password: hash, active: true, role: 'ADMIN', name: 'Cantina Admin' },
    create: {
      name: 'Cantina Admin',
      email: 'cantina@cantina.com',
      password: hash,
      role: 'ADMIN',
      active: true,
    },
  });

  console.log('✅ Usuário criado/atualizado:', cantina.email);

  // Also fix admin@cantina.com
  const adminHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@cantina.com' },
    update: { password: adminHash, active: true, role: 'ADMIN' },
    create: {
      name: 'Administrador',
      email: 'admin@cantina.com',
      password: adminHash,
      role: 'ADMIN',
      active: true,
    },
  });

  console.log('\n--- CREDENCIAIS ---');
  console.log('Email: cantina@cantina.com  |  Senha: cantina123');
  console.log('Email: admin@cantina.com    |  Senha: admin123');

  // Final check: read back from DB and verify
  const saved = await prisma.user.findUnique({ where: { email: 'cantina@cantina.com' } });
  if (saved) {
    const loginOk = await bcrypt.compare(senha, saved.password);
    console.log('\nVerificação final (login simulation):', loginOk ? '✅ SENHA CORRETA' : '❌ SENHA INCORRETA');
  }
}

fixAdmin()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
