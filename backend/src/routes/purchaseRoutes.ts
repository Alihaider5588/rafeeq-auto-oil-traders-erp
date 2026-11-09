import { Router } from 'express';
import { getPurchases, createPurchase, deletePurchase } from '../controllers/purchaseController';
import { authenticate, authorize } from '../middlewares/auth';
import { Role } from '../types/enums';

const router = Router();

router.use(authenticate);

router.get('/', getPurchases);
router.post('/', authorize([Role.ADMIN, Role.OPERATOR], 'action:edit_purchase'), createPurchase);
router.delete('/:id', authorize([Role.ADMIN], 'action:delete_purchase'), deletePurchase);

export default router;
