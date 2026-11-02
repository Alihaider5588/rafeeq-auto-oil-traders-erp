import { Router } from 'express';
import {
  getSales,
  getSaleById,
  createSale,
  approveSale,
  cancelSale,
  getCustomerProductRate,
  getCustomerAllRates,
  editSaleInvoice,
  createSalesReturn,
  deleteSale,
} from '../controllers/saleController';
import {
  getWebOrdersQueue,
  confirmWebOrder,
  rejectWebOrder,
  deleteWebOrder,
} from '../controllers/webOrderController';
import { authenticate, authorize } from '../middlewares/auth';
import { Role } from '../types/enums';

const router = Router();

router.use(authenticate);

// Online Website Orders Queue (View, Confirm, Reject, Delete)
router.get('/web-orders', getWebOrdersQueue);
router.post('/web-orders/:id/confirm', authorize([Role.ADMIN, Role.OPERATOR]), confirmWebOrder);
router.post('/web-orders/:id/reject', authorize([Role.ADMIN], ['action:delete_web_order', 'action:delete_sale']), rejectWebOrder);
router.delete('/web-orders/:id', authorize([Role.ADMIN], ['action:delete_web_order', 'action:delete_sale']), deleteWebOrder);

// Rate History query for party-product combination
router.get('/customer-rate', getCustomerProductRate);
router.get('/customer-rates', getCustomerAllRates);

// Sales CRUD & Workflows
router.get('/', getSales);
router.get('/:id', getSaleById);
router.post('/', createSale); // Admins, Operators, Cashiers & Salesmen can create sales
router.post('/:id/approve', authorize([Role.ADMIN, Role.OPERATOR]), approveSale);
// Invoice Cancellation, Correction & Permanent Deletion (Admin or assigned action permissions)
router.post('/:id/cancel', authorize([Role.ADMIN], ['action:delete_sale', 'action:delete_invoice']), cancelSale);
router.put('/:id/edit', authorize([Role.ADMIN], ['action:edit_sale', 'action:edit_invoice']), editSaleInvoice);
router.delete('/:id', authorize([Role.ADMIN], ['action:delete_sale', 'action:delete_invoice']), deleteSale);

// Sales Return / Order Wapsi with reason tracking
router.post('/:id/return', authorize([Role.ADMIN, Role.OPERATOR]), createSalesReturn);
router.post('/returns', authorize([Role.ADMIN, Role.OPERATOR]), createSalesReturn);

export default router;

