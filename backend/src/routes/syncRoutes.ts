import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middlewares/auth';
import {
  getSyncMetadata,
  getPendingLocalCount,
  runTwoWaySync,
  pullAllFromCloud,
} from '../services/syncService';

const router = Router();

// GET /api/sync/status
router.get('/status', authenticate, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isLocalMode = process.env.USE_POSTGRES !== 'true';
    const neonConfigured = !!(process.env.NEON_DATABASE_URL && process.env.NEON_DATABASE_URL.trim() !== '');

    if (!isLocalMode) {
      res.json({
        success: true,
        isLocalMode: false,
        mode: 'CLOUD_DIRECT',
        message: 'Direct Cloud Mode (Vercel / Neon)',
      });
      return;
    }

    const meta = getSyncMetadata();
    const lastSyncDate = meta.lastSyncTime ? new Date(meta.lastSyncTime) : null;
    const pendingLocalCount = await getPendingLocalCount(lastSyncDate);

    res.json({
      success: true,
      isLocalMode: true,
      neonConfigured,
      lastSyncTime: meta.lastSyncTime,
      lastSyncStatus: meta.lastSyncStatus,
      pendingLocalCount,
    });
  } catch (error: any) {
    console.error('Sync status error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve sync status' });
  }
});

// POST /api/sync/run
router.post('/run', authenticate, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isLocalMode = process.env.USE_POSTGRES !== 'true';
    if (!isLocalMode) {
      res.json({
        success: true,
        message: 'System is running in Cloud Direct Mode. Data is already live on Neon Cloud.',
      });
      return;
    }

    const result = await runTwoWaySync();
    res.json(result);
  } catch (error: any) {
    console.error('Two-way sync error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Cloud Sync fail ho gaya. Barah-e-karam apna internet connection check karein.',
    });
  }
});

// POST /api/sync/pull-all
router.post('/pull-all', authenticate, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await pullAllFromCloud();
    res.json(result);
  } catch (error: any) {
    console.error('Pull all error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Full Cloud database pull fail ho gaya. Barah-e-karam internet check karein.',
    });
  }
});

export default router;
