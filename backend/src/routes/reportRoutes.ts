import { Router } from 'express';
import {
  getDashboardStats,
  getProfitLossReport,
  getAiPredictionsAndGrowthTips,
} from '../controllers/reportController';
import { authenticate, authorize } from '../middlewares/auth';
import { Role } from '../types/enums';

const router = Router();

router.use(authenticate);

router.get('/dashboard-stats', getDashboardStats);
router.get('/profit-loss', authorize([Role.ADMIN, Role.OPERATOR], '/reports'), getProfitLossReport);
router.get('/ai-insights', authorize([Role.ADMIN, Role.OPERATOR], '/reports'), getAiPredictionsAndGrowthTips);

export default router;
