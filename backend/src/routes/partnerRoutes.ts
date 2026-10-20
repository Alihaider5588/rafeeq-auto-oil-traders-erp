import { Router } from 'express';
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  getCustomers,
  getCustomerById,
  createCustomer,
} from '../controllers/partnerController';
import { authenticate, authorize } from '../middlewares/auth';
import { Role } from '../types/enums';

const router = Router();

router.use(authenticate);

// Suppliers
router.get('/suppliers', getSuppliers);
router.get('/suppliers/:id', getSupplierById);
router.post('/suppliers', authorize([Role.ADMIN, Role.OPERATOR]), createSupplier);

// Customers
router.get('/customers', getCustomers);
router.get('/customers/:id', getCustomerById);
router.post('/customers', authorize([Role.ADMIN, Role.OPERATOR, Role.SALESMAN]), createCustomer);

export default router;
