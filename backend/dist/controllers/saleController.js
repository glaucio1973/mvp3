"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDailySummary = exports.cancelSale = exports.getSaleById = exports.getSales = exports.createSale = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const createSale = async (req, res) => {
    try {
        const { items, paymentMethod, notes, cashRegisterId } = req.body;
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Itens são obrigatórios' });
        }
        if (!paymentMethod) {
            return res.status(400).json({ error: 'Forma de pagamento é obrigatória' });
        }
        // Validate and calculate totals
        let total = 0;
        const saleItems = [];
        for (const item of items) {
            const product = await prisma_1.default.product.findUnique({ where: { id: item.productId } });
            if (!product)
                return res.status(400).json({ error: `Produto ${item.productId} não encontrado` });
            if (!product.active)
                return res.status(400).json({ error: `Produto ${product.name} está inativo` });
            if (product.stock < item.quantity) {
                return res.status(400).json({ error: `Estoque insuficiente para ${product.name}` });
            }
            const subtotal = product.price * item.quantity;
            total += subtotal;
            saleItems.push({
                productId: product.id,
                quantity: item.quantity,
                unitPrice: product.price,
                subtotal,
            });
        }
        // Create sale in transaction
        const sale = await prisma_1.default.$transaction(async (tx) => {
            const newSale = await tx.sale.create({
                data: {
                    operatorId: req.userId,
                    cashRegisterId: cashRegisterId || null,
                    total,
                    paymentMethod,
                    notes,
                    items: { create: saleItems },
                },
                include: {
                    items: { include: { product: true } },
                    operator: { select: { name: true } },
                },
            });
            // Decrease stock for each item
            for (const item of saleItems) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: { stock: { decrement: item.quantity } },
                });
                await tx.stockMovement.create({
                    data: {
                        productId: item.productId,
                        type: 'EXIT',
                        quantity: item.quantity,
                        notes: `Venda #${newSale.id}`,
                        createdBy: req.userId,
                    },
                });
            }
            return newSale;
        });
        await prisma_1.default.activityLog.create({
            data: {
                userId: req.userId,
                action: 'CREATE_SALE',
                details: `Venda ${sale.id} - Total: R$ ${total.toFixed(2)}`,
            },
        });
        return res.status(201).json(sale);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro ao criar venda' });
    }
};
exports.createSale = createSale;
const getSales = async (req, res) => {
    try {
        const { startDate, endDate, paymentMethod, status, page = '1', limit = '20' } = req.query;
        const where = {};
        if (req.userRole === 'OPERATOR') {
            where.operatorId = req.userId;
        }
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate)
                where.createdAt.gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                where.createdAt.lte = end;
            }
        }
        if (paymentMethod)
            where.paymentMethod = paymentMethod;
        if (status)
            where.status = status;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);
        const [sales, total] = await Promise.all([
            prisma_1.default.sale.findMany({
                where,
                include: {
                    operator: { select: { name: true } },
                    items: { include: { product: { select: { name: true, category: true } } } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take,
            }),
            prisma_1.default.sale.count({ where }),
        ]);
        return res.json({ sales, total, page: parseInt(page), limit: take });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro ao buscar vendas' });
    }
};
exports.getSales = getSales;
const getSaleById = async (req, res) => {
    try {
        const sale = await prisma_1.default.sale.findUnique({
            where: { id: req.params.id },
            include: {
                operator: { select: { name: true, email: true } },
                items: {
                    include: {
                        product: { select: { name: true, category: true, imageUrl: true } },
                    },
                },
            },
        });
        if (!sale)
            return res.status(404).json({ error: 'Venda não encontrada' });
        return res.json(sale);
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao buscar venda' });
    }
};
exports.getSaleById = getSaleById;
const cancelSale = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const sale = await prisma_1.default.sale.findUnique({
            where: { id },
            include: { items: true },
        });
        if (!sale)
            return res.status(404).json({ error: 'Venda não encontrada' });
        if (sale.status === 'CANCELLED')
            return res.status(400).json({ error: 'Venda já cancelada' });
        await prisma_1.default.$transaction(async (tx) => {
            await tx.sale.update({ where: { id }, data: { status: 'CANCELLED' } });
            // Restore stock
            for (const item of sale.items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: { stock: { increment: item.quantity } },
                });
                await tx.stockMovement.create({
                    data: {
                        productId: item.productId,
                        type: 'ENTRY',
                        quantity: item.quantity,
                        notes: `Cancelamento venda #${id}${reason ? `: ${reason}` : ''}`,
                        createdBy: req.userId,
                    },
                });
            }
        });
        await prisma_1.default.activityLog.create({
            data: {
                userId: req.userId,
                action: 'CANCEL_SALE',
                details: `Venda ${id} cancelada${reason ? `: ${reason}` : ''}`,
            },
        });
        return res.json({ message: 'Venda cancelada com sucesso' });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro ao cancelar venda' });
    }
};
exports.cancelSale = cancelSale;
const getDailySummary = async (req, res) => {
    try {
        const date = req.query.date ? new Date(req.query.date) : new Date();
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);
        const sales = await prisma_1.default.sale.findMany({
            where: { createdAt: { gte: start, lte: end }, status: 'COMPLETED' },
            include: { items: true },
        });
        const total = sales.reduce((sum, s) => sum + s.total, 0);
        const byPayment = sales.reduce((acc, s) => {
            acc[s.paymentMethod] = (acc[s.paymentMethod] || 0) + s.total;
            return acc;
        }, {});
        return res.json({ count: sales.length, total, byPayment, sales });
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao buscar resumo diário' });
    }
};
exports.getDailySummary = getDailySummary;
//# sourceMappingURL=saleController.js.map