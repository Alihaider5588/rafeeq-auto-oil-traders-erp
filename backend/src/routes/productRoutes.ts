import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  adjustProductStock,
  handleImageUpload,
  getCategories,
  createCategory,
  updateCategory,
  getUnits,
  createUnit,
  deleteProduct,
} from '../controllers/productController';
import { authenticate, authorize } from '../middlewares/auth';
import { Role } from '../types/enums';
import { uploadProductImage } from '../utils/upload';

const router = Router();

router.use(authenticate);

// Image Upload
router.post(
  '/upload-image',
  authorize([Role.ADMIN, Role.OPERATOR], 'action:edit_product'),
  uploadProductImage.single('image'),
  handleImageUpload
);

// Categories (Must be defined before /:id routes)
router.get('/meta/categories', getCategories);
router.post('/meta/categories', authorize([Role.ADMIN, Role.OPERATOR], 'action:edit_product'), createCategory);
router.put('/meta/categories/:id', authorize([Role.ADMIN, Role.OPERATOR], 'action:edit_product'), updateCategory);
router.get('/categories', getCategories);
router.post('/categories', authorize([Role.ADMIN, Role.OPERATOR], 'action:edit_product'), createCategory);
router.put('/categories/:id', authorize([Role.ADMIN, Role.OPERATOR], 'action:edit_product'), updateCategory);

// Units (Must be defined before /:id routes)
router.get('/meta/units', getUnits);
router.post('/meta/units', authorize([Role.ADMIN, Role.OPERATOR], 'action:edit_product'), createUnit);
router.get('/units', getUnits);
router.post('/units', authorize([Role.ADMIN, Role.OPERATOR], 'action:edit_product'), createUnit);

// Products
router.get('/', getProducts);
router.post('/', authorize([Role.ADMIN, Role.OPERATOR], 'action:edit_product'), createProduct);
router.get('/:id', getProductById);
router.put('/:id', authorize([Role.ADMIN, Role.OPERATOR], 'action:edit_product'), updateProduct);
router.delete('/:id', authorize([Role.ADMIN], 'action:delete_product'), deleteProduct);
router.post('/:id/adjust-stock', authorize([Role.ADMIN, Role.OPERATOR], 'action:edit_product'), adjustProductStock);

export default router;
