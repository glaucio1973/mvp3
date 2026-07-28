"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.getMe = exports.login = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('[login] tentativa:', email);
        if (!email || !password) {
            return res.status(400).json({ error: 'Email e senha são obrigatórios' });
        }
        const user = await prisma_1.default.user.findUnique({ where: { email } });
        console.log('[login] usuário encontrado:', !!user);
        if (!user) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }
        if (!user.active) {
            console.log('[login] usuário inativo');
            return res.status(401).json({ error: 'Usuário inativo' });
        }
        const valid = await bcryptjs_1.default.compare(password, user.password);
        console.log('[login] senha válida:', valid);
        if (!valid) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '8h' });
        await prisma_1.default.activityLog.create({
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
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
};
exports.login = login;
const getMe = async (req, res) => {
    try {
        const user = await prisma_1.default.user.findUnique({
            where: { id: req.userId },
            select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
        });
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        return res.json(user);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
};
exports.getMe = getMe;
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await prisma_1.default.user.findUnique({ where: { id: req.userId } });
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        const valid = await bcryptjs_1.default.compare(currentPassword, user.password);
        if (!valid) {
            return res.status(400).json({ error: 'Senha atual incorreta' });
        }
        const hashed = await bcryptjs_1.default.hash(newPassword, 10);
        await prisma_1.default.user.update({
            where: { id: req.userId },
            data: { password: hashed },
        });
        return res.json({ message: 'Senha alterada com sucesso' });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
};
exports.changePassword = changePassword;
//# sourceMappingURL=authController.js.map