import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    console.log('[login] tentativa:', email);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    console.log('[login] usuário encontrado:', !!user);
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    if (!user.active) {
      console.log('[login] usuário inativo');
      return res.status(401).json({ error: 'Usuário inativo' });
    }

    const valid = await bcrypt.compare(password, user.password);
    console.log('[login] senha válida:', valid);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '8h' }
    );

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        details: `Login realizado por ${user.name}`,
      },
    });

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    return res.json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return res.status(400).json({ error: 'Senha atual incorreta' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.userId },
      data: { password: hashed },
    });

    return res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
