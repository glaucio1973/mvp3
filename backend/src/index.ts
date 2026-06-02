import './setup'; // must be first — loads .env before any Prisma client is created

import express from 'express';
import cors from 'cors';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import productRoutes from './routes/products';
import saleRoutes from './routes/sales';
import cashRoutes from './routes/cash';
import reportRoutes from './routes/reports';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/cash', cashRoutes);
app.use('/api/reports', reportRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function ensureAdminExists() {
  const prisma = new PrismaClient();
  try {
    const count = await prisma.user.count();
    console.log(`[startup] DATABASE_URL: ${process.env.DATABASE_URL}`);
    console.log(`[startup] Usuários no banco: ${count}`);
    if (count === 0) {
      const hash = await bcrypt.hash('cantina123', 10);
      await prisma.user.create({
        data: {
          name: 'Cantina Admin',
          email: 'cantina@cantina.com',
          password: hash,
          role: 'ADMIN',
          active: true,
        },
      });
      console.log('[startup] ✅ Admin criado automaticamente: cantina@cantina.com / cantina123');
    }
  } finally {
    await prisma.$disconnect();
  }
}

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await ensureAdminExists();
});

export default app;
