import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getDashboard = async (_req: Request, res: Response) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    const [
      todaySales,
      monthSales,
      totalProducts,
      lowStockProducts,
      openCashRegister,
      recentSales,
    ] = await Promise.all([
      prisma.sale.aggregate({
        where: { createdAt: { gte: startOfDay, lte: endOfDay }, status: 'COMPLETED' },
        _sum: { total: true },
        _count: true,
      }),
      prisma.sale.aggregate({
        where: { createdAt: { gte: startOfMonth, lte: endOfMonth }, status: 'COMPLETED' },
        _sum: { total: true },
        _count: true,
      }),
      prisma.product.count({ where: { active: true } }),
      prisma.product.findMany({
        where: { active: true },
        select: { id: true, name: true, stock: true, minStock: true, category: true },
      }),
      prisma.cashRegister.findFirst({
        where: { status: 'OPEN' },
        include: { operator: { select: { name: true } } },
      }),
      prisma.sale.findMany({
        where: { status: 'COMPLETED' },
        include: {
          items: { include: { product: { select: { name: true } } } },
          operator: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const lowStock = lowStockProducts.filter(p => p.stock <= p.minStock);

    return res.json({
      todaySales: {
        total: todaySales._sum.total || 0,
        count: todaySales._count,
      },
      monthSales: {
        total: monthSales._sum.total || 0,
        count: monthSales._count,
      },
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
