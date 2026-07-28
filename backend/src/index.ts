import './setup'; // must be first — loads .env before any Prisma client is created
import prisma from './lib/prisma'; // second — creates the shared PrismaClient with DATABASE_URL loaded

import express from 'express';
import cors from 'cors';
import path from 'path';
import bcrypt from 'bcryptjs';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import productRoutes from './routes/products';
import saleRoutes from './routes/sales';
import cashRoutes from './routes/cash';
import reportRoutes from './routes/reports';

const app = express();
const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === 'production';

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
  : [];

app.use(
  cors({
    origin: IS_PROD
      ? (origin, cb) => {
          if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
            cb(null, true);
          } else {
            cb(new Error(`Origin ${origin} not allowed`));
          }
        }
      : true,
    credentials: true,
  })
);

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

// Serve built frontend in production
if (IS_PROD) {
  const frontendDist = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.get('/api/debug-login', async (_req, res) => {
  try {
    const count = await prisma.user.count();
    const user = await prisma.user.findUnique({ where: { email: 'cantina@cantina.com' } });
    if (!user) {
      return res.json({ dbUrl: process.env.DATABASE_URL, count, found: false });
    }
    const valid = await bcrypt.compare('cantina123', user.password);
    return res.json({ dbUrl: process.env.DATABASE_URL, count, found: true, active: user.active, passwordValid: valid });
  } catch (e: any) {
    return res.json({ error: e.message });
  }
});

async function ensureAdminExists() {
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
}

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await ensureAdminExists();
});

export default app;
