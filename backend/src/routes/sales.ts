import { Router } from 'express';
import {
  createSale,
  getSales,
  getSaleById,
  cancelSale,
  getDailySummary,
} from '../controllers/saleController';
import { authenticate } from '../middleware/auth';
import { adminOnly } from '../middleware/adminOnly';

const router = Router();

router.use(authenticate);

router.get('/', getSales);
router.get('/daily-summary', getDailySummary);
router.get('/:id', getSaleById);
router.post('/', createSale);
router.put('/:id/cancel', adminOnly, cancelSale);

export default router;
