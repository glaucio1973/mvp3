"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const saleController_1 = require("../controllers/saleController");
const auth_1 = require("../middleware/auth");
const adminOnly_1 = require("../middleware/adminOnly");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', saleController_1.getSales);
router.get('/daily-summary', saleController_1.getDailySummary);
router.get('/:id', saleController_1.getSaleById);
router.post('/', saleController_1.createSale);
router.put('/:id/cancel', adminOnly_1.adminOnly, saleController_1.cancelSale);
exports.default = router;
//# sourceMappingURL=sales.js.map