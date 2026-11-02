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
  authorize([Role.ADMIN, Role.OPERATOR]),
  uploadProductImage.single('image'),
  handleImageUpload
);

// Categories (Must be defined before /:id routes)
router.get('/meta/categories', getCategories);
router.post('/meta/categories', authorize([Role.ADMIN, Role.OPERATOR]), createCategory);
router.put('/meta/categories/:id', authorize([Role.ADMIN, Role.OPERATOR]), updateCategory);
router.get('/categories', getCategories);
router.post('/categories', authorize([Role.ADMIN, Role.OPERATOR]), createCategory);
router.put('/categories/:id', authorize([Role.ADMIN, Role.OPERATOR]), updateCategory);

// Units (Must be defined before /:id routes)
router.get('/meta/units', getUnits);
router.post('/meta/units', authorize([Role.ADMIN, Role.OPERATOR]), createUnit);
router.get('/units', getUnits);
router.post('/units', authorize([Role.ADMIN, Role.OPERATOR]), createUnit);

// Products
router.get('/', getProducts);
router.post('/', createProduct);
router.get('/:id', getProductById);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);
router.post('/:id/adjust-stock', adjustProductStock);

export default router;
