"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cashController_1 = require("../controllers/cashController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/current', cashController_1.getCurrentCashRegister);
router.get('/history', cashController_1.getCashHistory);
router.get('/:id', cashController_1.getCashRegisterById);
router.post('/open', cashController_1.openCashRegister);
router.put('/:id/close', cashController_1.closeCashRegister);
router.post('/:id/movements', cashController_1.addCashMovement);
exports.default = router;
//# sourceMappingURL=cash.js.map