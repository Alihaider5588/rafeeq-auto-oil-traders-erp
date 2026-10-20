import { Router } from 'express';
import { getPurchases, createPurchase } from '../controllers/purchaseController';
import { authenticate, authorize } from '../middlewares/auth';
import { Role } from '../types/enums';

const router = Router();

router.use(authenticate);

router.get('/', getPurchases);
router.post('/', authorize([Role.ADMIN, Role.OPERATOR]), createPurchase);

export default router;
