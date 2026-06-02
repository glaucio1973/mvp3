import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Multer config
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `product-${Date.now()}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Tipo de arquivo não permitido'));
  },
});

export const getProducts = async (req: Request, res: Response) => {
  try {
    const { category, search, lowStock, active } = req.query;
    const where: any = {};

    if (active !== 'all') where.active = active === 'false' ? false : true;
    if (category && category !== 'all') where.category = category as string;
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { sku: { contains: search as string } },
        { description: { contains: search as string } },
      ];
    }
    if (lowStock === 'true') {
      // We'll filter after query since Prisma SQLite doesn't support column comparison directly
    }

    let products = await prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    if (lowStock === 'true') {
      products = products.filter(p => p.stock <= p.minStock);
    }

    return res.json(products);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const product = await prisma.product.findUnique({
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

    if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
    return res.json(product);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar produto' });
  }
};

export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { name, category, sku, description, price, stock, minStock } = req.body;

    if (!name || !category || !sku || !price) {
      return res.status(400).json({ error: 'Nome, categoria, SKU e preço são obrigatórios' });
    }

    const existing = await prisma.product.findUnique({ where: { sku } });
    if (existing) return res.status(400).json({ error: 'SKU já cadastrado' });

    let imageUrl: string | undefined;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    const product = await prisma.product.create({
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
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          type: 'ENTRY',
          quantity: parseInt(stock),
          notes: 'Estoque inicial',
          createdBy: req.userId!,
        },
      });
    }

    await prisma.activityLog.create({
      data: { userId: req.userId!, action: 'CREATE_PRODUCT', details: `Produto ${name} criado` },
    });

    return res.status(201).json(product);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao criar produto' });
  }
};

export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, category, sku, description, price, minStock, active } = req.body;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Produto não encontrado' });

    let imageUrl = existing.imageUrl;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
      // Delete old image
      if (existing.imageUrl) {
        const oldPath = path.join(__dirname, '../../', existing.imageUrl);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }

    const newPrice = price ? parseFloat(price) : existing.price;

    // Record price change if price changed
    if (newPrice !== existing.price) {
      await prisma.priceHistory.create({
        data: {
          productId: id,
          oldPrice: existing.price,
          newPrice,
          changedBy: req.userId!,
        },
      });
    }

    const product = await prisma.product.update({
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

    await prisma.activityLog.create({
      data: { userId: req.userId!, action: 'UPDATE_PRODUCT', details: `Produto ${product.name} atualizado` },
    });

    return res.json(product);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao atualizar produto' });
  }
};

export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.product.update({ where: { id }, data: { active: false } });
    await prisma.activityLog.create({
      data: { userId: req.userId!, action: 'DELETE_PRODUCT', details: `Produto ${id} desativado` },
    });
    return res.json({ message: 'Produto desativado com sucesso' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao desativar produto' });
  }
};

export const adjustStock = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { type, quantity, notes } = req.body;

    if (!type || !quantity) {
      return res.status(400).json({ error: 'Tipo e quantidade são obrigatórios' });
    }

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ error: 'Produto não encontrado' });

    const qty = parseInt(quantity);
    let newStock = product.stock;

    if (type === 'ENTRY') newStock += qty;
    else if (type === 'EXIT') newStock = Math.max(0, newStock - qty);
    else if (type === 'ADJUSTMENT') newStock = qty;

    await prisma.product.update({ where: { id }, data: { stock: newStock } });

    const movement = await prisma.stockMovement.create({
      data: {
        productId: id,
        type,
        quantity: qty,
        notes,
        createdBy: req.userId!,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.userId!,
        action: 'STOCK_ADJUSTMENT',
        details: `Estoque de ${product.name} ajustado: ${type} ${qty}`,
      },
    });

    return res.json({ movement, newStock });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao ajustar estoque' });
  }
};

export const getCategories = async (_req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });
    return res.json(products.map(p => p.category));
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
};

export const getPriceHistory = async (req: Request, res: Response) => {
  try {
    const history = await prisma.priceHistory.findMany({
      where: { productId: req.params.id },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(history);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar histórico de preços' });
  }
};

export const getStockMovements = async (req: Request, res: Response) => {
  try {
    const movements = await prisma.stockMovement.findMany({
      where: { productId: req.params.id },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(movements);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar movimentos de estoque' });
  }
};
