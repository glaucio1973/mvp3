import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

export const openCashRegister = async (req: AuthRequest, res: Response) => {
  try {
    const { initialValue } = req.body;

    if (initialValue === undefined || initialValue === null) {
      return res.status(400).json({ error: 'Valor inicial é obrigatório' });
    }

    // Check if there's already an open register
    const existing = await prisma.cashRegister.findFirst({
      where: { status: 'OPEN' },
    });
    if (existing) {
      return res.status(400).json({ error: 'Já existe um caixa aberto', cashRegister: existing });
    }

    const cashRegister = await prisma.cashRegister.create({
      data: {
        operatorId: req.userId!,
        initialValue: parseFloat(initialValue),
        status: 'OPEN',
      },
      include: { operator: { select: { name: true } } },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.userId!,
        action: 'OPEN_CASH',
        details: `Caixa aberto com R$ ${parseFloat(initialValue).toFixed(2)}`,
      },
    });

    return res.status(201).json(cashRegister);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao abrir caixa' });
  }
};

export const closeCashRegister = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { finalValue } = req.body;

    if (finalValue === undefined || finalValue === null) {
      return res.status(400).json({ error: 'Valor final é obrigatório' });
    }

    const cashRegister = await prisma.cashRegister.findUnique({
      where: { id },
      include: {
        sales: { include: { operator: { select: { name: true } } } },
        movements: true,
      },
    });

    if (!cashRegister) return res.status(404).json({ error: 'Caixa não encontrado' });
    if (cashRegister.status === 'CLOSED') return res.status(400).json({ error: 'Caixa já fechado' });

    // Calculate expected value
    const salesTotal = cashRegister.sales
      .filter(s => s.status === 'COMPLETED' && s.paymentMethod === 'CASH')
      .reduce((sum, s) => sum + s.total, 0);

    const movementsTotal = cashRegister.movements.reduce((sum, m) => {
      return m.type === 'ENTRY' ? sum + m.amount : sum - m.amount;
    }, 0);

    const expectedValue = cashRegister.initialValue + salesTotal + movementsTotal;
    const fv = parseFloat(finalValue);
    const difference = fv - expectedValue;

    // Operator breakdown for the closing summary
    const byOperator: Record<string, { name: string; total: number; count: number; byPayment: Record<string, number> }> = {};
    for (const sale of cashRegister.sales.filter(s => s.status === 'COMPLETED')) {
      const opId = sale.operatorId;
      const opName = (sale as any).operator?.name || 'Desconhecido';
      if (!byOperator[opId]) byOperator[opId] = { name: opName, total: 0, count: 0, byPayment: { CASH: 0, CARD: 0, PIX: 0 } };
      byOperator[opId].total += sale.total;
      byOperator[opId].count += 1;
      byOperator[opId].byPayment[sale.paymentMethod] = (byOperator[opId].byPayment[sale.paymentMethod] || 0) + sale.total;
    }

    const byPayment = cashRegister.sales
      .filter(s => s.status === 'COMPLETED')
      .reduce((acc: Record<string, number>, s) => {
        acc[s.paymentMethod] = (acc[s.paymentMethod] || 0) + s.total;
        return acc;
      }, { CASH: 0, CARD: 0, PIX: 0 });

    const updated = await prisma.cashRegister.update({
      where: { id },
      data: {
        status: 'CLOSED',
        finalValue: fv,
        expectedValue,
        difference,
        closedAt: new Date(),
      },
      include: {
        operator: { select: { name: true } },
        sales: { include: { items: true, operator: { select: { name: true } } } },
        movements: { include: { user: { select: { name: true } } } },
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.userId!,
        action: 'CLOSE_CASH',
        details: `Caixa fechado. Esperado: R$ ${expectedValue.toFixed(2)}, Informado: R$ ${fv.toFixed(2)}, Diferença: R$ ${difference.toFixed(2)}`,
      },
    });

    return res.json({ ...updated, byOperator: Object.values(byOperator), byPayment });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao fechar caixa' });
  }
};

export const getCurrentCashRegister = async (req: AuthRequest, res: Response) => {
  try {
    const isOperator = req.userRole === 'OPERATOR';
    const where: any = { status: 'OPEN' };
    if (isOperator) where.operatorId = req.userId;
    const cashRegister = await prisma.cashRegister.findFirst({
      where,
      include: {
        operator: { select: { name: true, email: true } },
        sales: {
          where: { status: 'COMPLETED' },
          include: { items: { include: { product: { select: { name: true } } } } },
          orderBy: { createdAt: 'desc' },
        },
        movements: {
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!cashRegister) {
      return res.json(null);
    }

    // Calculate current totals
    const salesCash = cashRegister.sales
      .filter(s => s.paymentMethod === 'CASH')
      .reduce((sum, s) => sum + s.total, 0);

    const movementsTotal = cashRegister.movements.reduce((sum, m) => {
      return m.type === 'ENTRY' ? sum + m.amount : sum - m.amount;
    }, 0);

    const currentTotal = cashRegister.initialValue + salesCash + movementsTotal;
    const totalSales = cashRegister.sales.reduce((sum, s) => sum + s.total, 0);

    return res.json({ ...cashRegister, currentTotal, totalSales });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao buscar caixa atual' });
  }
};

export const getCashHistory = async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '10' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const isOperator = req.userRole === 'OPERATOR';
    const historyWhere = isOperator ? { operatorId: req.userId! } : {};

    const [registers, total] = await Promise.all([
      prisma.cashRegister.findMany({
        where: historyWhere,
        include: {
          operator: { select: { name: true } },
          _count: { select: { sales: true, movements: true } },
        },
        orderBy: { openedAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.cashRegister.count({ where: historyWhere }),
    ]);

    return res.json({ registers, total });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar histórico de caixa' });
  }
};

export const getCashRegisterById = async (req: Request, res: Response) => {
  try {
    const cashRegister = await prisma.cashRegister.findUnique({
      where: { id: req.params.id },
      include: {
        operator: { select: { name: true } },
        sales: {
          include: {
            items: { include: { product: { select: { name: true } } } },
            operator: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        movements: {
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!cashRegister) return res.status(404).json({ error: 'Caixa não encontrado' });
    return res.json(cashRegister);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar caixa' });
  }
};

export const addCashMovement = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { type, amount, description } = req.body;

    if (!type || !amount || !description) {
      return res.status(400).json({ error: 'Tipo, valor e descrição são obrigatórios' });
    }

    const cashRegister = await prisma.cashRegister.findUnique({ where: { id } });
    if (!cashRegister) return res.status(404).json({ error: 'Caixa não encontrado' });
    if (cashRegister.status === 'CLOSED') return res.status(400).json({ error: 'Caixa fechado' });

    const movement = await prisma.cashMovement.create({
      data: {
        cashRegisterId: id,
        type,
        amount: parseFloat(amount),
        description,
        createdBy: req.userId!,
      },
      include: { user: { select: { name: true } } },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.userId!,
        action: 'CASH_MOVEMENT',
        details: `Movimento de caixa: ${type} R$ ${parseFloat(amount).toFixed(2)} - ${description}`,
      },
    });

    return res.status(201).json(movement);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao registrar movimento' });
  }
};
