"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActivityLogs = exports.deleteUser = exports.resetPassword = exports.updateUser = exports.createUser = exports.getUserById = exports.getUsers = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const getUsers = async (_req, res) => {
    try {
        const users = await prisma_1.default.user.findMany({
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
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
};
exports.getUsers = getUsers;
const getUserById = async (req, res) => {
    try {
        const user = await prisma_1.default.user.findUnique({
            where: { id: req.params.id },
            select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
        });
        if (!user)
            return res.status(404).json({ error: 'Usuário não encontrado' });
        return res.json(user);
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao buscar usuário' });
    }
};
exports.getUserById = getUserById;
const createUser = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
        }
        const existing = await prisma_1.default.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: 'Email já cadastrado' });
        }
        const hashed = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma_1.default.user.create({
            data: { name, email, password: hashed, role: role || 'OPERATOR' },
            select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
        });
        await prisma_1.default.activityLog.create({
            data: {
                userId: req.userId,
                action: 'CREATE_USER',
                details: `Usuário ${name} criado`,
            },
        });
        return res.status(201).json(user);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro ao criar usuário' });
    }
};
exports.createUser = createUser;
const updateUser = async (req, res) => {
    try {
        const { name, email, role, active } = req.body;
        const { id } = req.params;
        const user = await prisma_1.default.user.update({
            where: { id },
            data: { name, email, role, active },
            select: { id: true, name: true, email: true, role: true, active: true, updatedAt: true },
        });
        await prisma_1.default.activityLog.create({
            data: {
                userId: req.userId,
                action: 'UPDATE_USER',
                details: `Usuário ${user.name} atualizado`,
            },
        });
        return res.json(user);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
};
exports.updateUser = updateUser;
const resetPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
        }
        const hashed = await bcryptjs_1.default.hash(newPassword, 10);
        await prisma_1.default.user.update({ where: { id }, data: { password: hashed } });
        await prisma_1.default.activityLog.create({
            data: {
                userId: req.userId,
                action: 'RESET_PASSWORD',
                details: `Senha do usuário ${id} redefinida`,
            },
        });
        return res.json({ message: 'Senha redefinida com sucesso' });
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao redefinir senha' });
    }
};
exports.resetPassword = resetPassword;
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        // Soft delete
        await prisma_1.default.user.update({ where: { id }, data: { active: false } });
        await prisma_1.default.activityLog.create({
            data: {
                userId: req.userId,
                action: 'DELETE_USER',
                details: `Usuário ${id} desativado`,
            },
        });
        return res.json({ message: 'Usuário desativado com sucesso' });
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao desativar usuário' });
    }
};
exports.deleteUser = deleteUser;
const getActivityLogs = async (_req, res) => {
    try {
        const logs = await prisma_1.default.activityLog.findMany({
            include: { user: { select: { name: true, email: true } } },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
        return res.json(logs);
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao buscar logs' });
    }
};
exports.getActivityLogs = getActivityLogs;
//# sourceMappingURL=userController.js.map