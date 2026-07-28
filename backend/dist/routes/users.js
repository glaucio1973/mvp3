"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const auth_1 = require("../middleware/auth");
const adminOnly_1 = require("../middleware/adminOnly");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', adminOnly_1.adminOnly, userController_1.getUsers);
router.get('/logs', adminOnly_1.adminOnly, userController_1.getActivityLogs);
router.get('/:id', adminOnly_1.adminOnly, userController_1.getUserById);
router.post('/', adminOnly_1.adminOnly, userController_1.createUser);
router.put('/:id', adminOnly_1.adminOnly, userController_1.updateUser);
router.put('/:id/reset-password', adminOnly_1.adminOnly, userController_1.resetPassword);
router.delete('/:id', adminOnly_1.adminOnly, userController_1.deleteUser);
exports.default = router;
//# sourceMappingURL=users.js.map