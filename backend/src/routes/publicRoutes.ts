import { Router } from 'express';
import {
  getPublicProducts,
  getPublicProductById,
  getPublicCategories,
  getPublicCompanyInfo,
  submitPublicInquiry,
  submitWebOrder,
} from '../controllers/publicController';

import { publicSubmissionsLimiter } from '../middlewares/rateLimiter';

const router = Router();

// Publicly accessible endpoints (No authentication required)
router.get('/products', getPublicProducts);
router.get('/products/:id', getPublicProductById);
router.get('/categories', getPublicCategories);
router.get('/company', getPublicCompanyInfo);
router.post('/contact', publicSubmissionsLimiter, submitPublicInquiry);
router.post('/orders', publicSubmissionsLimiter, submitWebOrder); // Web Order Placement Queue

export default router;

