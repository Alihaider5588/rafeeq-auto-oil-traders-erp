import { Router } from 'express';
import {
  getPublicProducts,
  getPublicProductById,
  getPublicCategories,
  getPublicCompanyInfo,
  submitPublicInquiry,
  submitWebOrder,
} from '../controllers/publicController';

const router = Router();

// Publicly accessible endpoints (No authentication required)
router.get('/products', getPublicProducts);
router.get('/products/:id', getPublicProductById);
router.get('/categories', getPublicCategories);
router.get('/company', getPublicCompanyInfo);
router.post('/contact', submitPublicInquiry);
router.post('/orders', submitWebOrder); // Web Order Placement Queue

export default router;

