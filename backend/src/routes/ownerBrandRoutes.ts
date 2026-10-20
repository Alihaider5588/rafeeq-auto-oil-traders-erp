import { Router } from 'express';
import {
  verifyOwnerBrandAccess,
  requireOwnerBrandAuth,
  getOwnerBrandProducts,
  createOwnerBrandProduct,
  updateOwnerBrandProduct,
  getOwnerBrandSuppliers,
  createOwnerBrandSupplier,
  getOwnerBrandPurchases,
  createOwnerBrandPurchase,
  getOwnerBrandSales,
  createOwnerBrandSale,
  getOwnerBrandReport,
  deleteOwnerBrandSale,
  deleteOwnerBrandPurchase,
  changeVaultPassword,
  parseReceiptData,
} from '../controllers/ownerBrandController';
import { authenticate, authorize } from '../middlewares/auth';
import { Role } from '../types/enums';

const router = Router();

// Strictly authenticate and require ADMIN role for all routes in this namespace
router.use(authenticate);
router.use(authorize([Role.ADMIN]));

// Re-verification endpoint (receives password, verifies, returns token)
router.post('/verify-access', verifyOwnerBrandAccess);

// Change Vault / Master Admin Password
router.post('/change-password', changeVaultPassword);

// Protected by re-verification token requirement
router.use(requireOwnerBrandAuth);

// Offline Receipt Parser / Document Scanner (No External API Key)
router.post('/parse-receipt', parseReceiptData);

// Products
router.get('/products', getOwnerBrandProducts);
router.post('/products', createOwnerBrandProduct);
router.put('/products/:id', updateOwnerBrandProduct);

// Suppliers
router.get('/suppliers', getOwnerBrandSuppliers);
router.post('/suppliers', createOwnerBrandSupplier);

// Purchases
router.get('/purchases', getOwnerBrandPurchases);
router.post('/purchases', createOwnerBrandPurchase);
router.delete('/purchases/:id', deleteOwnerBrandPurchase);

// Sales
router.get('/sales', getOwnerBrandSales);
router.post('/sales', createOwnerBrandSale);
router.delete('/sales/:id', deleteOwnerBrandSale);

// Confidential Reports
router.get(['/reports/summary', '/report'], getOwnerBrandReport);

export default router;
