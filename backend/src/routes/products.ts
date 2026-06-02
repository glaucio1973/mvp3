import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustStock,
  getCategories,
  getPriceHistory,
  getStockMovements,
  upload,
} from '../controllers/productController';
import { authenticate } from '../middleware/auth';
import { adminOnly } from '../middleware/adminOnly';

const router = Router();

router.use(authenticate);

router.get('/', getProducts);
router.get('/categories', getCategories);
router.get('/:id', getProductById);
router.get('/:id/price-history', getPriceHistory);
router.get('/:id/stock-movements', getStockMovements);
router.post('/', adminOnly, upload.single('image'), createProduct);
router.put('/:id', adminOnly, upload.single('image'), updateProduct);
router.delete('/:id', adminOnly, deleteProduct);
router.post('/:id/stock', authenticate, adjustStock);

export default router;
