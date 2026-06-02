import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const { period = 'today', startDate, endDate } = req.query;
    const isOperator = req.userRole === 'OPERATOR';

    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (period) {
      case '7d':
        start = new Date(now);
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        break;
      case '15d':
        start = new Date(now);
        start.setDate(start.getDate() - 15);
        start.setHours(0, 0, 0, 0);
        break;
      case '30d':
        start = new Date(now);
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        break;
      case 'custom':
        start = startDate ? new Date(startDate as string) : new Date(new Date(now).setHours(0, 0, 0, 0));
        end = endDate
          ? (() => { const d = new Date(endDate as string); d.setHours(23, 59, 59, 999); return d; })()
          : new Date();
        break;
      default: // today
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        break;
    }

    if (period !== 'custom') end = new Date();

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const operatorFilter = isOperator ? { operatorId: req.userId! } : {};

    const [periodSalesRaw, todaySales, monthSales, totalProducts, lowStockProducts, openCashRegister, recentSales] = await Promise.all([
      prisma.sale.findMany({
        where: { ...operatorFilter, status: 'COMPLETED', createdAt: { gte: start, lte: end } },
        include: { operator: { select: { id: true, name: true } } },
      }),
      prisma.sale.aggregate({
        where: { ...operatorFilter, status: 'COMPLETED', createdAt: { gte: startOfDay, lte: endOfDay } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.sale.aggregate({
        where: { ...operatorFilter, status: 'COMPLETED', createdAt: { gte: startOfMonth, lte: endOfMonth } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.product.count({ where: { active: true } }),
      prisma.product.findMany({
        where: { active: true },
        select: { id: true, name: true, stock: true, minStock: true, category: true },
      }),
      prisma.cashRegister.findFirst({
        where: { status: 'OPEN', ...(isOperator ? { operatorId: req.userId! } : {}) },
        include: { operator: { select: { name: true } } },
      }),
      prisma.sale.findMany({
        where: { ...operatorFilter, status: 'COMPLETED' },
        include: {
          items: { include: { product: { select: { name: true } } } },
          operator: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const lowStock = lowStockProducts.filter(p => p.stock <= p.minStock);
    const periodTotal = periodSalesRaw.reduce((s, sale) => s + sale.total, 0);

    // byOperator breakdown
    const operatorMap: Record<string, { name: string; total: number; count: number }> = {};
    const paymentMap: Record<string, number> = { CASH: 0, CARD: 0, PIX: 0 };
    for (const sale of periodSalesRaw) {
      const opId = sale.operatorId;
      const opName = (sale as any).operator?.name || 'Desconhecido';
      if (!operatorMap[opId]) operatorMap[opId] = { name: opName, total: 0, count: 0 };
      operatorMap[opId].total += sale.total;
      operatorMap[opId].count += 1;
      paymentMap[sale.paymentMethod] = (paymentMap[sale.paymentMethod] || 0) + sale.total;
    }

    return res.json({
      period: { start, end, label: period as string },
      periodSales: { total: periodTotal, count: periodSalesRaw.length },
      byOperator: Object.values(operatorMap),
      byPayment: paymentMap,
      todaySales: { total: todaySales._sum.total || 0, count: todaySales._count },
      monthSales: { total: monthSales._sum.total || 0, count: monthSales._count },
      totalProducts,
      lowStockCount: lowStock.length,
      lowStockProducts: lowStock.slice(0, 5),
      openCashRegister,
      recentSales,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao buscar dados do dashboard' });
  }
};

export const getSalesReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    const start = startDate ? new Date(startDate as string) : (() => {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      d.setHours(0, 0, 0, 0);
      return d;
    })();

    const end = endDate ? (() => {
      const d = new Date(endDate as string);
      d.setHours(23, 59, 59, 999);
      return d;
    })() : new Date();

    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: start, lte: end }, status: 'COMPLETED' },
      include: {
        items: { include: { product: { select: { name: true, category: true } } } },
        operator: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const byDay: Record<string, { date: string; total: number; count: number }> = {};
    const byPayment: Record<string, number> = { CASH: 0, CARD: 0, PIX: 0 };
    const byCategory: Record<string, number> = {};
    const byProduct: Record<string, { name: string; quantity: number; total: number }> = {};
    const byOperator: Record<string, { name: string; total: number; count: number; byPayment: Record<string, number> }> = {};

    for (const sale of sales) {
      const dateKey = sale.createdAt.toISOString().split('T')[0];

      if (!byDay[dateKey]) byDay[dateKey] = { date: dateKey, total: 0, count: 0 };
      byDay[dateKey].total += sale.total;
      byDay[dateKey].count += 1;

      byPayment[sale.paymentMethod] = (byPayment[sale.paymentMethod] || 0) + sale.total;

      const opId = sale.operatorId;
      const opName = sale.operator?.name || 'Desconhecido';
      if (!byOperator[opId]) byOperator[opId] = { name: opName, total: 0, count: 0, byPayment: { CASH: 0, CARD: 0, PIX: 0 } };
      byOperator[opId].total += sale.total;
      byOperator[opId].count += 1;
      byOperator[opId].byPayment[sale.paymentMethod] = (byOperator[opId].byPayment[sale.paymentMethod] || 0) + sale.total;

      for (const item of sale.items) {
        const cat = item.product.category;
        byCategory[cat] = (byCategory[cat] || 0) + item.subtotal;

        const pid = item.productId;
        if (!byProduct[pid]) byProduct[pid] = { name: item.product.name, quantity: 0, total: 0 };
        byProduct[pid].quantity += item.quantity;
        byProduct[pid].total += item.subtotal;
      }
    }

    const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
    const avgTicket = sales.length > 0 ? totalRevenue / sales.length : 0;

    const topProducts = Object.entries(byProduct)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    return res.json({
      summary: {
        totalRevenue,
        totalSales: sales.length,
        avgTicket,
        period: { start, end },
      },
      byDay: Object.values(byDay),
      byPayment,
      byCategory,
      byOperator: Object.values(byOperator),
      topProducts,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao gerar relatório de vendas' });
  }
};

export const getStockReport = async (_req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: { active: true },
      orderBy: { stock: 'asc' },
    });

    const lowStock = products.filter(p => p.stock <= p.minStock);
    const outOfStock = products.filter(p => p.stock === 0);
    const healthy = products.filter(p => p.stock > p.minStock);

    const byCategory: Record<string, { count: number; value: number }> = {};
    for (const p of products) {
      if (!byCategory[p.category]) byCategory[p.category] = { count: 0, value: 0 };
      byCategory[p.category].count += p.stock;
      byCategory[p.category].value += p.stock * p.price;
    }

    const totalValue = products.reduce((sum, p) => sum + p.stock * p.price, 0);

    return res.json({
      summary: {
        totalProducts: products.length,
        lowStockCount: lowStock.length,
        outOfStockCount: outOfStock.length,
        healthyCount: healthy.length,
        totalValue,
      },
      lowStock,
      outOfStock,
      byCategory,
      products,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao gerar relatório de estoque' });
  }
};

export const getCashReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : (() => {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      d.setHours(0, 0, 0, 0);
      return d;
    })();

    const end = endDate ? (() => {
      const d = new Date(endDate as string);
      d.setHours(23, 59, 59, 999);
      return d;
    })() : new Date();

    const registers = await prisma.cashRegister.findMany({
      where: { openedAt: { gte: start, lte: end } },
      include: {
        operator: { select: { name: true } },
        sales: { where: { status: 'COMPLETED' } },
        movements: true,
      },
      orderBy: { openedAt: 'desc' },
    });

    const summary = registers.reduce(
      (acc, r) => {
        const salesTotal = r.sales.reduce((sum, s) => sum + s.total, 0);
        acc.totalSales += salesTotal;
        acc.totalRegisters += 1;
        if (r.difference !== null) {
          acc.totalDifference += r.difference;
        }
        return acc;
      },
      { totalSales: 0, totalRegisters: 0, totalDifference: 0 }
    );

    return res.json({ summary, registers });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao gerar relatório de caixa' });
  }
};

export const getWeeklyReport = async (_req: Request, res: Response) => {
  try {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);

    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: start, lte: end }, status: 'COMPLETED' },
      include: { items: true },
      orderBy: { createdAt: 'asc' },
    });

    const byDay: Record<string, { date: string; label: string; total: number; count: number }> = {};
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    for (const sale of sales) {
      const dateKey = sale.createdAt.toISOString().split('T')[0];
      const dayLabel = days[sale.createdAt.getDay()];
      if (!byDay[dateKey]) byDay[dateKey] = { date: dateKey, label: dayLabel, total: 0, count: 0 };
      byDay[dateKey].total += sale.total;
      byDay[dateKey].count += 1;
    }

    return res.json({
      period: { start, end },
      data: Object.values(byDay),
      total: sales.reduce((sum, s) => sum + s.total, 0),
      count: sales.length,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao gerar relatório semanal' });
  }
};

export const getAbcReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate
      ? new Date(startDate as string)
      : new Date(new Date().setFullYear(new Date().getFullYear() - 1));
    const end = endDate
      ? (() => { const d = new Date(endDate as string); d.setHours(23, 59, 59, 999); return d; })()
      : new Date();

    const grouped = await prisma.saleItem.groupBy({
      by: ['productId'],
      where: { sale: { status: 'COMPLETED', createdAt: { gte: start, lte: end } } },
      _sum: { subtotal: true, quantity: true },
      orderBy: { _sum: { subtotal: 'desc' } },
    });

    const productIds = grouped.map(g => g.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, category: true, price: true, stock: true },
    });
    const productMap = Object.fromEntries(products.map(p => [p.id, p]));

    const totalRevenue = grouped.reduce((s, g) => s + (g._sum.subtotal || 0), 0);
    let cumulative = 0;

    const items = grouped.map(g => {
      const revenue = g._sum.subtotal || 0;
      cumulative += revenue;
      const cumulativePct = totalRevenue > 0 ? cumulative / totalRevenue : 0;
      const revenuePct = totalRevenue > 0 ? revenue / totalRevenue : 0;
      const cls = cumulativePct <= 0.7 ? 'A' : cumulativePct <= 0.9 ? 'B' : 'C';
      return {
        productId: g.productId,
        name: productMap[g.productId]?.name || 'Desconhecido',
        category: productMap[g.productId]?.category || '',
        revenue,
        revenuePct: revenuePct * 100,
        cumulativePct: cumulativePct * 100,
        quantity: g._sum.quantity || 0,
        class: cls,
      };
    });

    const summary = {
      A: { count: items.filter(i => i.class === 'A').length, revenue: items.filter(i => i.class === 'A').reduce((s, i) => s + i.revenue, 0) },
      B: { count: items.filter(i => i.class === 'B').length, revenue: items.filter(i => i.class === 'B').reduce((s, i) => s + i.revenue, 0) },
      C: { count: items.filter(i => i.class === 'C').length, revenue: items.filter(i => i.class === 'C').reduce((s, i) => s + i.revenue, 0) },
    };

    return res.json({ items, summary, totalRevenue, period: { start, end } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao gerar curva ABC' });
  }
};

export const getCashDailyReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate
      ? new Date(startDate as string)
      : (() => { const d = new Date(); d.setDate(d.getDate() - 30); d.setHours(0, 0, 0, 0); return d; })();
    const end = endDate
      ? (() => { const d = new Date(endDate as string); d.setHours(23, 59, 59, 999); return d; })()
      : new Date();

    const registers = await prisma.cashRegister.findMany({
      where: { openedAt: { gte: start, lte: end } },
      include: {
        operator: { select: { name: true } },
        sales: {
          where: { status: 'COMPLETED' },
          include: { operator: { select: { name: true } } },
        },
        movements: true,
      },
      orderBy: { openedAt: 'desc' },
    });

    const enriched = registers.map(reg => {
      const salesTotal = reg.sales.reduce((s, sale) => s + sale.total, 0);
      const byPayment = reg.sales.reduce((acc: Record<string, number>, s) => {
        acc[s.paymentMethod] = (acc[s.paymentMethod] || 0) + s.total;
        return acc;
      }, { CASH: 0, CARD: 0, PIX: 0 });
      const byOperator: Record<string, { name: string; total: number }> = {};
      for (const s of reg.sales) {
        if (!byOperator[s.operatorId]) {
          byOperator[s.operatorId] = { name: (s as any).operator?.name || 'Desconhecido', total: 0 };
        }
        byOperator[s.operatorId].total += s.total;
      }
      return { ...reg, salesTotal, byPayment, byOperator: Object.values(byOperator) };
    });

    return res.json({ registers: enriched });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao gerar relatório diário' });
  }
};
