import { Router } from 'express';
import {
  getDashboard,
  getSalesReport,
  getStockReport,
  getCashReport,
  getWeeklyReport,
  getAbcReport,
  getCashDailyReport,
} from '../controllers/reportController';
import { authenticate } from '../middleware/auth';
import { adminOnly } from '../middleware/adminOnly';

const router = Router();

router.use(authenticate);

router.get('/dashboard', getDashboard);
router.get('/sales', adminOnly, getSalesReport);
router.get('/stock', adminOnly, getStockReport);
router.get('/cash', adminOnly, getCashReport);
router.get('/weekly', getWeeklyReport);
router.get('/abc', adminOnly, getAbcReport);
router.get('/cash-daily', adminOnly, getCashDailyReport);

export default router;
