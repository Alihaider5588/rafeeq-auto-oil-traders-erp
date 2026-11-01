import { Router } from 'express';
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  deleteSupplier,
  createDualPartner,
  getDualPartners,
  linkExistingPartners,
} from '../controllers/partnerController';
import { authenticate, authorize } from '../middlewares/auth';
import { Role } from '../types/enums';

const router = Router();

router.use(authenticate);

// Dual Partners (Customer + Supplier Both)
router.get('/dual', getDualPartners);
router.post('/dual', authorize([Role.ADMIN, Role.OPERATOR]), createDualPartner);
router.post('/link-dual', authorize([Role.ADMIN, Role.OPERATOR]), linkExistingPartners);

// Suppliers
router.get('/suppliers', getSuppliers);
router.get('/suppliers/:id', getSupplierById);
router.post('/suppliers', authorize([Role.ADMIN, Role.OPERATOR]), createSupplier);
router.put('/suppliers/:id', authorize([Role.ADMIN], 'action:edit_supplier'), updateSupplier);
router.patch('/suppliers/:id', authorize([Role.ADMIN], 'action:edit_supplier'), updateSupplier);
router.delete('/suppliers/:id', authorize([Role.ADMIN], 'action:delete_supplier'), deleteSupplier);

// Customers
router.get('/customers', getCustomers);
router.get('/customers/:id', getCustomerById);
router.post('/customers', authorize([Role.ADMIN, Role.OPERATOR, Role.SALESMAN]), createCustomer);
router.put('/customers/:id', authorize([Role.ADMIN], 'action:edit_customer'), updateCustomer);
router.patch('/customers/:id', authorize([Role.ADMIN], 'action:edit_customer'), updateCustomer);
router.delete('/customers/:id', authorize([Role.ADMIN], 'action:delete_customer'), deleteCustomer);

export default router;
