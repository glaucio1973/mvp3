"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./setup"); // must be first — loads .env before any Prisma client is created
const prisma_1 = __importDefault(require("./lib/prisma")); // second — creates the shared PrismaClient with DATABASE_URL loaded
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const products_1 = __importDefault(require("./routes/products"));
const sales_1 = __importDefault(require("./routes/sales"));
const cash_1 = __importDefault(require("./routes/cash"));
const reports_1 = __importDefault(require("./routes/reports"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === 'production';
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
    : [];
app.use((0, cors_1.default)({
    origin: IS_PROD
        ? (origin, cb) => {
            if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
                cb(null, true);
            }
            else {
                cb(new Error(`Origin ${origin} not allowed`));
            }
        }
        : true,
    credentials: true,
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
app.use('/api/auth', auth_1.default);
app.use('/api/users', users_1.default);
app.use('/api/products', products_1.default);
app.use('/api/sales', sales_1.default);
app.use('/api/cash', cash_1.default);
app.use('/api/reports', reports_1.default);
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Serve built frontend in production
if (IS_PROD) {
    const frontendDist = path_1.default.join(__dirname, '../../frontend/dist');
    app.use(express_1.default.static(frontendDist));
    app.get('*', (_req, res) => {
        res.sendFile(path_1.default.join(frontendDist, 'index.html'));
    });
}
app.get('/api/debug-login', async (_req, res) => {
    try {
        const count = await prisma_1.default.user.count();
        const user = await prisma_1.default.user.findUnique({ where: { email: 'cantina@cantina.com' } });
        if (!user) {
            return res.json({ dbUrl: process.env.DATABASE_URL, count, found: false });
        }
        const valid = await bcryptjs_1.default.compare('cantina123', user.password);
        return res.json({ dbUrl: process.env.DATABASE_URL, count, found: true, active: user.active, passwordValid: valid });
    }
    catch (e) {
        return res.json({ error: e.message });
    }
});
async function ensureAdminExists() {
    const count = await prisma_1.default.user.count();
    console.log(`[startup] DATABASE_URL: ${process.env.DATABASE_URL}`);
    console.log(`[startup] Usuários no banco: ${count}`);
    if (count === 0) {
        const hash = await bcryptjs_1.default.hash('cantina123', 10);
        await prisma_1.default.user.create({
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
exports.default = app;
//# sourceMappingURL=index.js.map