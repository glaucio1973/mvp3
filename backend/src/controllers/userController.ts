import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

export const getUsers = async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(users);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    return res.json(user);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role: role || 'OPERATOR' },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.userId!,
        action: 'CREATE_USER',
        details: `Usuário ${name} criado`,
      },
    });

    return res.status(201).json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao criar usuário' });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, role, active } = req.body;
    const { id } = req.params;

    const user = await prisma.user.update({
      where: { id },
      data: { name, email, role, active },
      select: { id: true, name: true, email: true, role: true, active: true, updatedAt: true },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.userId!,
        action: 'UPDATE_USER',
        details: `Usuário ${user.name} atualizado`,
      },
    });

    return res.json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
};

export const resetPassword = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id }, data: { password: hashed } });

    await prisma.activityLog.create({
      data: {
        userId: req.userId!,
        action: 'RESET_PASSWORD',
        details: `Senha do usuário ${id} redefinida`,
      },
    });

    return res.json({ message: 'Senha redefinida com sucesso' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao redefinir senha' });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Soft delete
    await prisma.user.update({ where: { id }, data: { active: false } });

    await prisma.activityLog.create({
      data: {
        userId: req.userId!,
        action: 'DELETE_USER',
        details: `Usuário ${id} desativado`,
      },
    });

    return res.json({ message: 'Usuário desativado com sucesso' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao desativar usuário' });
  }
};

export const getActivityLogs = async (_req: Request, res: Response) => {
  try {
    const logs = await prisma.activityLog.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return res.json(logs);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar logs' });
  }
};
