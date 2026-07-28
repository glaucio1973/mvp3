"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const productController_1 = require("../controllers/productController");
const auth_1 = require("../middleware/auth");
const adminOnly_1 = require("../middleware/adminOnly");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', productController_1.getProducts);
router.get('/categories', productController_1.getCategories);
router.get('/:id', productController_1.getProductById);
router.get('/:id/price-history', productController_1.getPriceHistory);
router.get('/:id/stock-movements', productController_1.getStockMovements);
router.post('/', adminOnly_1.adminOnly, productController_1.upload.single('image'), productController_1.createProduct);
router.put('/:id', adminOnly_1.adminOnly, productController_1.upload.single('image'), productController_1.updateProduct);
router.delete('/:id', adminOnly_1.adminOnly, productController_1.deleteProduct);
router.post('/:id/stock', auth_1.authenticate, productController_1.adjustStock);
exports.default = router;
//# sourceMappingURL=products.js.map