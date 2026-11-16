import { Router, Response } from 'express';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import { authenticate, AuthenticatedRequest } from '../middlewares/auth';
import {
  getSyncMetadata,
  getPendingLocalCount,
  runTwoWaySync,
  pullAllFromCloud,
} from '../services/syncService';

const execPromise = util.promisify(exec);
const router = Router();

// Cache version check for 60 seconds
let cachedVersionCheck: {
  timestamp: number;
  data: any;
} | null = null;

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

// GET /api/sync/version-check
router.get('/version-check', authenticate, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isLocalMode = process.env.USE_POSTGRES !== 'true';
    if (!isLocalMode) {
      res.json({
        success: true,
        isLocalMode: false,
        updateAvailable: false,
      });
      return;
    }

    const now = Date.now();
    if (cachedVersionCheck && (now - cachedVersionCheck.timestamp < 60000)) {
      res.json(cachedVersionCheck.data);
      return;
    }

    const repoRoot = path.resolve(__dirname, '..', '..');
    let localSha = '';
    try {
      const gitOut = await execPromise('git rev-parse HEAD', { cwd: repoRoot });
      localSha = gitOut.stdout.trim();
    } catch (e) {
      console.warn('Unable to get local git commit:', e);
    }

    // Query GitHub public API
    let remoteSha = '';
    let commitMessage = '';
    let commitDate = '';
    let authorName = '';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const ghRes = await fetch(
        'https://api.github.com/repos/Alihaider5588/rafeeq-auto-oil-traders-erp/commits/master',
        {
          headers: {
            'User-Agent': 'RafiqPOS-Updater',
            'Accept': 'application/vnd.github.v3+json',
          },
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (ghRes.ok) {
        const ghData: any = await ghRes.json();
        remoteSha = ghData.sha || '';
        commitMessage = ghData.commit?.message?.split('\n')[0] || '';
        commitDate = ghData.commit?.author?.date || '';
        authorName = ghData.commit?.author?.name || '';
      }
    } catch (_netErr) {
      // Offline or network timeout: return gracefully
      const responseData = {
        success: true,
        isLocalMode: true,
        updateAvailable: false,
        offline: true,
        currentVersion: localSha ? localSha.substring(0, 7) : 'unknown',
      };
      res.json(responseData);
      return;
    }

    const updateAvailable = Boolean(localSha && remoteSha && localSha !== remoteSha);

    const responseData = {
      success: true,
      isLocalMode: true,
      updateAvailable,
      currentVersion: localSha ? localSha.substring(0, 7) : 'unknown',
      latestVersion: remoteSha ? remoteSha.substring(0, 7) : 'unknown',
      commitMessage,
      commitDate,
      authorName,
    };

    cachedVersionCheck = {
      timestamp: now,
      data: responseData,
    };

    res.json(responseData);
  } catch (error: any) {
    console.error('Version check error:', error);
    res.json({
      success: true,
      isLocalMode: true,
      updateAvailable: false,
      error: error.message,
    });
  }
});

// POST /api/sync/install-update
router.post('/install-update', authenticate, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isLocalMode = process.env.USE_POSTGRES !== 'true';
    if (!isLocalMode) {
      res.status(400).json({ success: false, message: 'Updates are only installed directly on the local shop computer.' });
      return;
    }

    const repoRoot = path.resolve(__dirname, '..', '..');
    const backendDir = path.join(repoRoot, 'backend');
    const frontendDir = path.join(repoRoot, 'frontend');

    console.log('[Updater] Step 1/4: Pulling latest master updates from GitHub...');
    const pullResult = await execPromise('git pull origin master', { cwd: repoRoot });
    console.log('[Updater] Git pull output:', pullResult.stdout);

    console.log('[Updater] Step 2/4: Regenerating database client...');
    await execPromise('npx prisma generate', { cwd: backendDir });

    console.log('[Updater] Step 3/4: Building Frontend POS interface...');
    await execPromise('npm run build', { cwd: frontendDir });

    console.log('[Updater] Step 4/4: Building Backend...');
    try {
      await execPromise('npm run build', { cwd: backendDir });
    } catch (bErr) {
      console.warn('[Updater] Backend build notice (non-fatal for running instance):', bErr);
    }

    // Invalidate version check cache
    cachedVersionCheck = null;

    // Run Two-Way Sync so any new data is also brought down immediately
    try {
      await runTwoWaySync();
    } catch (syncErr: any) {
      console.warn('[Updater] Post-update sync notice:', syncErr?.message || syncErr);
    }

    res.json({
      success: true,
      message: 'سسٹم کامیابی سے اپڈیٹ ہو گیا ہے! نیا ورژن لوڈ ہو رہا ہے...',
      reloadRequired: true,
    });
  } catch (error: any) {
    console.error('[Updater] Update installation error:', error);
    res.status(500).json({
      success: false,
      message: error?.message || 'سسٹم اپڈیٹ انسٹال کرنے میں مسئلہ پیش آیا۔ برائے مہربانی انٹرنیٹ چیک کریں۔',
    });
  }
});

export default router;
