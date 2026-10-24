import { Router } from 'express';
import { getCustomerLedger, getSupplierLedger, recordPayment, deleteLedgerEntry } from '../controllers/ledgerController';
import { authenticate, authorize } from '../middlewares/auth';
import { Role } from '../types/enums';

const router = Router();

router.use(authenticate);

router.get('/customer/:customerId', getCustomerLedger);
router.get('/supplier/:supplierId', getSupplierLedger);
router.post('/payment', recordPayment);
router.delete('/entry/:id', authorize([Role.ADMIN]), deleteLedgerEntry);

export default router;
