import { Router } from 'express';
import {
  getSettings,
  updateSettings,
  getAuditLogs,
  bulkImportProducts,
  bulkUpdateProducts,
  bulkImportParties,
  exportToTally,
  verifyDataIntegrity,
  closeFinancialYear,
} from '../controllers/settingController';
import { authenticate, authorize } from '../middlewares/auth';
import { Role } from '../types/enums';

const router = Router();

router.use(authenticate);

router.get('/', getSettings);
router.put('/', authorize([Role.ADMIN], '/admin/settings'), updateSettings);
router.post('/', authorize([Role.ADMIN], '/admin/settings'), updateSettings);
router.get('/audit-logs', authorize([Role.ADMIN], '/admin/audit'), getAuditLogs);

// Vyapaar Utilities
router.post('/utilities/import-items', authorize([Role.ADMIN, Role.OPERATOR], '/admin/utilities'), bulkImportProducts);
router.post('/utilities/bulk-update-items', authorize([Role.ADMIN, Role.OPERATOR], '/admin/utilities'), bulkUpdateProducts);
router.post('/utilities/import-parties', authorize([Role.ADMIN, Role.OPERATOR], '/admin/utilities'), bulkImportParties);
router.get('/utilities/export-tally', authorize([Role.ADMIN], '/admin/utilities'), exportToTally);
router.get('/utilities/verify-data', authorize([Role.ADMIN, Role.OPERATOR], '/admin/utilities'), verifyDataIntegrity);
router.post('/utilities/close-financial-year', authorize([Role.ADMIN], '/admin/utilities'), closeFinancialYear);

export default router;
