import { Router } from 'express';
import {
  getDashboardStats,
  getProfitLossReport,
  getAiPredictionsAndGrowthTips,
} from '../controllers/reportController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/dashboard-stats', getDashboardStats);
router.get('/profit-loss', getProfitLossReport);
router.get('/ai-insights', getAiPredictionsAndGrowthTips);

export default router;
