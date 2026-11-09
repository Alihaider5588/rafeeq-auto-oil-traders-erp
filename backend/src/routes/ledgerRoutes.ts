import { Router } from 'express';
import {
  getCustomerLedger,
  getSupplierLedger,
  recordPayment,
  deleteLedgerEntry,
  getDualPartnerLedger,
  recordContraOffset,
} from '../controllers/ledgerController';
import { authenticate, authorize } from '../middlewares/auth';
import { Role } from '../types/enums';

const router = Router();

router.use(authenticate);

// Dual Partner (Mutual / Contra) Ledger
router.get('/dual/:id', getDualPartnerLedger);
router.post('/contra-offset', authorize([Role.ADMIN, Role.OPERATOR], 'action:edit_ledger'), recordContraOffset);

// Customer & Supplier Individual Ledgers
router.get('/customer/:customerId', getCustomerLedger);
router.get('/supplier/:supplierId', getSupplierLedger);
router.post('/payment', authorize([Role.ADMIN, Role.OPERATOR, Role.CASHIER], 'action:edit_ledger'), recordPayment);
router.delete('/entry/:id', authorize([Role.ADMIN], 'action:delete_ledger'), deleteLedgerEntry);

export default router;
