"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const reportController_1 = require("../controllers/reportController");
const auth_1 = require("../middleware/auth");
const adminOnly_1 = require("../middleware/adminOnly");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/dashboard', reportController_1.getDashboard);
router.get('/sales', adminOnly_1.adminOnly, reportController_1.getSalesReport);
router.get('/stock', adminOnly_1.adminOnly, reportController_1.getStockReport);
router.get('/cash', adminOnly_1.adminOnly, reportController_1.getCashReport);
router.get('/weekly', reportController_1.getWeeklyReport);
router.get('/abc', adminOnly_1.adminOnly, reportController_1.getAbcReport);
router.get('/cash-daily', adminOnly_1.adminOnly, reportController_1.getCashDailyReport);
exports.default = router;
//# sourceMappingURL=reports.js.map