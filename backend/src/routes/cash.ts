import { Router } from 'express';
import {
  openCashRegister,
  closeCashRegister,
  getCurrentCashRegister,
  getCashHistory,
  getCashRegisterById,
  addCashMovement,
} from '../controllers/cashController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/current', getCurrentCashRegister);
router.get('/history', getCashHistory);
router.get('/:id', getCashRegisterById);
router.post('/open', openCashRegister);
router.put('/:id/close', closeCashRegister);
router.post('/:id/movements', addCashMovement);

export default router;
