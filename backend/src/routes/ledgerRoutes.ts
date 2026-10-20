import { Router } from 'express';
import { getCustomerLedger, getSupplierLedger, recordPayment } from '../controllers/ledgerController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/customer/:customerId', getCustomerLedger);
router.get('/supplier/:supplierId', getSupplierLedger);
router.post('/payment', recordPayment);

export default router;
