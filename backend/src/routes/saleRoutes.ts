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
  getPendingDeliveries,
  updateDeliveryStatus,
  getClaimsList,
  updateClaimDisposition,
  getReclaimedOilDrum,
  updateReclaimedDrumRate,
  dumpOilIntoReclaimedDrum,
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

// Pending Delivery Reminders (امانت لسٹ)
router.get('/pending-deliveries', getPendingDeliveries);
router.post('/:id/update-delivery', updateDeliveryStatus);

// Reclaimed Loose Oil Drum (ڈرم کا کھلا آئل)
router.get('/reclaimed-drum', getReclaimedOilDrum);
router.post('/reclaimed-drum/rate', authorize([Role.ADMIN, Role.OPERATOR]), updateReclaimedDrumRate);
router.post('/reclaimed-drum/dump', authorize([Role.ADMIN, Role.OPERATOR]), dumpOilIntoReclaimedDrum);

// Warranty Claims & Defective Store (وارنٹی کلیمز و خراب اسٹاک)
router.get('/claims', getClaimsList);
router.post('/claims/:id/disposition', authorize([Role.ADMIN, Role.OPERATOR]), updateClaimDisposition);

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
router.post('/:id/return', authorize([Role.ADMIN, Role.OPERATOR], ['action:edit_sale', 'action:edit_invoice']), createSalesReturn);
router.post('/returns', authorize([Role.ADMIN, Role.OPERATOR], ['action:edit_sale', 'action:edit_invoice']), createSalesReturn);

export default router;

