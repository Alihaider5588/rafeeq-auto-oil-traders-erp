import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import partnerRoutes from './routes/partnerRoutes';
import purchaseRoutes from './routes/purchaseRoutes';
import saleRoutes from './routes/saleRoutes';
import ledgerRoutes from './routes/ledgerRoutes';
import deliveryRoutes from './routes/deliveryRoutes';
import reportRoutes from './routes/reportRoutes';
import settingRoutes from './routes/settingRoutes';
import publicRoutes from './routes/publicRoutes';
import ownerBrandRoutes from './routes/ownerBrandRoutes';
import expenseRoutes from './routes/expenseRoutes';
import employeeRoutes from './routes/employeeRoutes';
import syncRoutes from './routes/syncRoutes';
import { getSyncMetadata, getPendingLocalCount, runTwoWaySync } from './services/syncService';

import { getAllowedCorsOrigins } from './utils/security';
import { apiLimiter } from './middlewares/rateLimiter';
import { sanitizeRequest } from './middlewares/sanitizer';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Enable trust proxy for Vercel / reverse proxy deployment
app.set('trust proxy', 1);

// Hardening: Disable information-disclosing Express header
app.disable('x-powered-by');

// Security & Utility Middlewares: Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow serving uploaded images
    frameguard: { action: 'sameorigin' }, // Clickjacking defense
    xContentTypeOptions: true, // Prevent MIME sniffing
  })
);

// Restricted CORS configuration: Whitelist valid origins only
const allowedOrigins = getAllowedCorsOrigins();
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow mobile apps, curl, postman, and server-to-server requests without origin header
      if (!origin) return callback(null, true);

      const isAllowed = allowedOrigins.some((allowed) => {
        if (typeof allowed === 'string') return allowed === origin;
        if (allowed instanceof RegExp) return allowed.test(origin);
        return false;
      });

      const isDomainMatch =
        origin.includes('rafiqautoandoiltraders.com') ||
        origin.includes('rafeeqautoandoiltraders.com') ||
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1');

      if (isAllowed || isDomainMatch || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }

      return callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-owner-token'],
    credentials: true,
  })
);

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(sanitizeRequest);

// Static file serving for uploaded product images with security protections
const uploadsPath = path.join(__dirname, '..', 'uploads');
app.use(
  '/uploads',
  express.static(uploadsPath, {
    dotfiles: 'ignore',
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  })
);

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Global API Rate Limiter
app.use('/api', apiLimiter);

// Health check endpoint
app.get(['/health', '/api/health'], (_req, res) => {
  res.json({
    status: 'online',
    system: 'RAFIQ AUTO & OIL TRADERS ERP Backend',
    timestamp: new Date().toISOString(),
  });
});

// Register API Routes
app.use('/api/public', publicRoutes); // Public website catalog & inquiries (No Auth, Rate Limited)
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/ledgers', ledgerRoutes);
app.use('/api/logistics', deliveryRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/owner-brand', ownerBrandRoutes); // Confidential Admin-only owner brand module
app.use('/api/expenses', expenseRoutes); // Small business cashbook & expenses
app.use('/api/hr', employeeRoutes); // Employees, Attendance & Payroll
app.use('/api/sync', syncRoutes); // Local-to-Neon Cloud Two-Way Sync Engine

// Local Standalone Production: Serve compiled React frontend directly from port 5000 if dist exists
const frontendDistPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.json({
      status: 'online',
      system: 'RAFIQ AUTO & OIL TRADERS ERP Backend API',
      timestamp: new Date().toISOString(),
    });
  });
}

// Global Error Handler (Sanitizes errors in production to avoid leaking database details)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  const isProd = process.env.NODE_ENV === 'production';
  const status = typeof err.status === 'number' && err.status >= 400 && err.status < 600 ? err.status : 500;

  let message = err.message || 'Internal Server Error';
  if (isProd && status === 500) {
    message = 'An unexpected internal server error occurred. Please contact the administrator.';
  }

  res.status(status).json({
    success: false,
    message,
  });
});

// =========================================================================
// HOURLY BACKGROUND AUTO-SYNC SERVICE (Only active in Local Offline Mode)
// =========================================================================
function startHourlyAutoSync() {
  const isLocalMode = process.env.USE_POSTGRES !== 'true';
  const neonConfigured = !!(process.env.NEON_DATABASE_URL && process.env.NEON_DATABASE_URL.trim() !== '');

  if (!isLocalMode || !neonConfigured) {
    return;
  }

  const ONE_HOUR = 60 * 60 * 1000;
  console.log('[Auto-Sync] Background hourly sync service initialized (Interval: 1 hour).');

  setInterval(async () => {
    try {
      const meta = getSyncMetadata();
      const lastSyncDate = meta.lastSyncTime ? new Date(meta.lastSyncTime) : null;
      const pendingCount = await getPendingLocalCount(lastSyncDate);

      if (pendingCount > 0) {
        console.log(`[Auto-Sync] Found ${pendingCount} pending local record(s). Attempting hourly cloud sync...`);
        const result = await runTwoWaySync();
        console.log('[Auto-Sync] Hourly sync completed successfully:', result.pushed);
      } else {
        console.log('[Auto-Sync] No new local transactions since last sync. Skipping cloud wake-up to save compute hours.');
      }
    } catch (err: any) {
      // Gracefully catch network / DNS errors if shop is currently offline
      console.log(`[Auto-Sync] Internet unavailable or sync paused: ${err.message || 'Offline'}. Will retry next hour.`);
    }
  }, ONE_HOUR);
}

export default app;

// Only start HTTP listener when running as a standalone server (not on Vercel Serverless)
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(Number(port), '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(` RAFIQ AUTO & OIL TRADERS API running on port ${port}`);
    console.log(` Local:   http://localhost:${port}`);
    console.log(` Network: http://0.0.0.0:${port} (Accessible from Mobile/Laptop)`);
    console.log(` Security: Rate Limiting & Whitelist CORS Active`);
    console.log(`=======================================================`);

    startHourlyAutoSync();
  });
}
