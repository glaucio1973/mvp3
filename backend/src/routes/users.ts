import { Router } from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  resetPassword,
  deleteUser,
  getActivityLogs,
} from '../controllers/userController';
import { authenticate } from '../middleware/auth';
import { adminOnly } from '../middleware/adminOnly';

const router = Router();

router.use(authenticate);

router.get('/', adminOnly, getUsers);
router.get('/logs', adminOnly, getActivityLogs);
router.get('/:id', adminOnly, getUserById);
router.post('/', adminOnly, createUser);
router.put('/:id', adminOnly, updateUser);
router.put('/:id/reset-password', adminOnly, resetPassword);
router.delete('/:id', adminOnly, deleteUser);

export default router;
