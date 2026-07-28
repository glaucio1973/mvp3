"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminOnly = void 0;
const adminOnly = (req, res, next) => {
    if (req.userRole !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin only' });
    }
    next();
};
exports.adminOnly = adminOnly;
//# sourceMappingURL=adminOnly.js.map