"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStockMovements = exports.getPriceHistory = exports.getCategories = exports.adjustStock = exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProductById = exports.getProducts = exports.upload = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Multer config
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        const uploadDir = path_1.default.join(__dirname, '../../uploads');
        if (!fs_1.default.existsSync(uploadDir))
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname);
        cb(null, `product-${Date.now()}${ext}`);
    },
});
exports.upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (allowed.includes(file.mimetype))
            cb(null, true);
        else
            cb(new Error('Tipo de arquivo não permitido'));
    },
});
const getProducts = async (req, res) => {
    try {
        const { category, search, lowStock, active } = req.query;
        const where = {};
        if (active !== 'all')
            where.active = active === 'false' ? false : true;
        if (category && category !== 'all')
            where.category = category;
        if (search) {
            where.OR = [
                { name: { contains: search } },
                { sku: { contains: search } },
                { description: { contains: search } },
            ];
        }
        if (lowStock === 'true') {
            // We'll filter after query since Prisma SQLite doesn't support column comparison directly
        }
        let products = await prisma_1.default.product.findMany({
            where,
            orderBy: { name: 'asc' },
        });
        if (lowStock === 'true') {
            products = products.filter(p => p.stock <= p.minStock);
        }
        return res.json(products);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro ao buscar produtos' });
    }
};
exports.getProducts = getProducts;
const getProductById = async (req, res) => {
    try {
        const product = await prisma_1.default.product.findUnique({
            where: { id: req.params.id },
            include: {
                priceHistory: {
                    include: { user: { select: { name: true } } },
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
                stockMovements: {
                    include: { user: { select: { name: true } } },
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                },
            },
        });
        if (!product)
            return res.status(404).json({ error: 'Produto não encontrado' });
        return res.json(product);
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao buscar produto' });
    }
};
exports.getProductById = getProductById;
const createProduct = async (req, res) => {
    try {
        const { name, category, sku, description, price, stock, minStock } = req.body;
        if (!name || !category || !sku || !price) {
            return res.status(400).json({ error: 'Nome, categoria, SKU e preço são obrigatórios' });
        }
        const existing = await prisma_1.default.product.findUnique({ where: { sku } });
        if (existing)
            return res.status(400).json({ error: 'SKU já cadastrado' });
        let imageUrl;
        if (req.file) {
            imageUrl = `/uploads/${req.file.filename}`;
        }
        const product = await prisma_1.default.product.create({
            data: {
                name,
                category,
                sku,
                description,
                price: parseFloat(price),
                stock: parseInt(stock) || 0,
                minStock: parseInt(minStock) || 5,
                imageUrl,
            },
        });
        if (parseInt(stock) > 0) {
            await prisma_1.default.stockMovement.create({
                data: {
                    productId: product.id,
                    type: 'ENTRY',
                    quantity: parseInt(stock),
                    notes: 'Estoque inicial',
                    createdBy: req.userId,
                },
            });
        }
        await prisma_1.default.activityLog.create({
            data: { userId: req.userId, action: 'CREATE_PRODUCT', details: `Produto ${name} criado` },
        });
        return res.status(201).json(product);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro ao criar produto' });
    }
};
exports.createProduct = createProduct;
const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, sku, description, price, minStock, active } = req.body;
        const existing = await prisma_1.default.product.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ error: 'Produto não encontrado' });
        let imageUrl = existing.imageUrl;
        if (req.file) {
            imageUrl = `/uploads/${req.file.filename}`;
            // Delete old image
            if (existing.imageUrl) {
                const oldPath = path_1.default.join(__dirname, '../../', existing.imageUrl);
                if (fs_1.default.existsSync(oldPath))
                    fs_1.default.unlinkSync(oldPath);
            }
        }
        const newPrice = price ? parseFloat(price) : existing.price;
        // Record price change if price changed
        if (newPrice !== existing.price) {
            await prisma_1.default.priceHistory.create({
                data: {
                    productId: id,
                    oldPrice: existing.price,
                    newPrice,
                    changedBy: req.userId,
                },
            });
        }
        const product = await prisma_1.default.product.update({
            where: { id },
            data: {
                name: name || existing.name,
                category: category || existing.category,
                sku: sku || existing.sku,
                description,
                price: newPrice,
                minStock: minStock ? parseInt(minStock) : existing.minStock,
                active: active !== undefined ? active === 'true' || active === true : existing.active,
                imageUrl,
            },
        });
        await prisma_1.default.activityLog.create({
            data: { userId: req.userId, action: 'UPDATE_PRODUCT', details: `Produto ${product.name} atualizado` },
        });
        return res.json(product);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro ao atualizar produto' });
    }
};
exports.updateProduct = updateProduct;
const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma_1.default.product.update({ where: { id }, data: { active: false } });
        await prisma_1.default.activityLog.create({
            data: { userId: req.userId, action: 'DELETE_PRODUCT', details: `Produto ${id} desativado` },
        });
        return res.json({ message: 'Produto desativado com sucesso' });
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao desativar produto' });
    }
};
exports.deleteProduct = deleteProduct;
const adjustStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { type, quantity, notes } = req.body;
        if (!type || !quantity) {
            return res.status(400).json({ error: 'Tipo e quantidade são obrigatórios' });
        }
        const product = await prisma_1.default.product.findUnique({ where: { id } });
        if (!product)
            return res.status(404).json({ error: 'Produto não encontrado' });
        const qty = parseInt(quantity);
        let newStock = product.stock;
        if (type === 'ENTRY')
            newStock += qty;
        else if (type === 'EXIT')
            newStock = Math.max(0, newStock - qty);
        else if (type === 'ADJUSTMENT')
            newStock = qty;
        await prisma_1.default.product.update({ where: { id }, data: { stock: newStock } });
        const movement = await prisma_1.default.stockMovement.create({
            data: {
                productId: id,
                type,
                quantity: qty,
                notes,
                createdBy: req.userId,
            },
        });
        await prisma_1.default.activityLog.create({
            data: {
                userId: req.userId,
                action: 'STOCK_ADJUSTMENT',
                details: `Estoque de ${product.name} ajustado: ${type} ${qty}`,
            },
        });
        return res.json({ movement, newStock });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro ao ajustar estoque' });
    }
};
exports.adjustStock = adjustStock;
const getCategories = async (_req, res) => {
    try {
        const products = await prisma_1.default.product.findMany({
            select: { category: true },
            distinct: ['category'],
            orderBy: { category: 'asc' },
        });
        return res.json(products.map(p => p.category));
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao buscar categorias' });
    }
};
exports.getCategories = getCategories;
const getPriceHistory = async (req, res) => {
    try {
        const history = await prisma_1.default.priceHistory.findMany({
            where: { productId: req.params.id },
            include: { user: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
        });
        return res.json(history);
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao buscar histórico de preços' });
    }
};
exports.getPriceHistory = getPriceHistory;
const getStockMovements = async (req, res) => {
    try {
        const movements = await prisma_1.default.stockMovement.findMany({
            where: { productId: req.params.id },
            include: { user: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
        });
        return res.json(movements);
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao buscar movimentos de estoque' });
    }
};
exports.getStockMovements = getStockMovements;
//# sourceMappingURL=productController.js.map