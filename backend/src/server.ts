import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
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

// Root and health check endpoints
app.get('/', (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rafiq Auto & Oil Traders - Central Server</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 40px 20px; display: flex; justify-content: center; align-items: center; min-height: 80vh; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 36px; max-width: 600px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
    .badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid #059669; border-radius: 20px; font-weight: 700; font-size: 0.85rem; }
    h1 { margin: 16px 0 6px 0; font-size: 1.6rem; font-weight: 800; color: #fff; }
    .subtitle { color: #d97706; font-size: 1rem; font-weight: 700; margin-bottom: 20px; }
    p { color: #94a3b8; font-size: 0.9rem; line-height: 1.5; margin: 0 0 20px 0; }
    .btn-group { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
    .btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 20px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 0.9rem; transition: all 0.2s; }
    .btn-primary { background: #d97706; color: #fff; }
    .btn-primary:hover { background: #b45309; }
    .btn-secondary { background: #334155; color: #f8fafc; }
    .btn-secondary:hover { background: #475569; }
    .meta-box { background: #0f172a; border-radius: 10px; padding: 16px; border: 1px solid #334155; }
    .meta-item { display: flex; justify-content: space-between; font-size: 0.85rem; padding: 6px 0; border-bottom: 1px solid #1e293b; }
    .meta-item:last-child { border-bottom: none; }
    .meta-label { color: #64748b; }
    .meta-val { color: #cbd5e1; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">● Central Server Online (Port 5000)</span>
    <h1>RAFIQ AUTO & OIL TRADERS</h1>
    <div class="subtitle">رفیق آٹو اینڈ آئل ٹریڈرز - اوکاڑہ</div>
    <p>The backend REST API and database engine are running securely. Authorized operators and administrators can access the system via the secure web interface.</p>
    
    <div class="btn-group">
      <a href="https://rafeeq-auto-oil-traders-erp-fr1b.vercel.app/login" class="btn btn-primary" target="_blank">Open POS & ERP App ↗</a>
      <a href="https://rafeeq-auto-oil-traders-erp-fr1b.vercel.app/website" class="btn btn-secondary" target="_blank">Public Website Catalog ↗</a>
      <a href="/api/public/products" class="btn btn-secondary">Public Products JSON</a>
    </div>

    <div class="meta-box">
      <div class="meta-item">
        <span class="meta-label">Backend Service:</span>
        <span class="meta-val">Node.js Express + Prisma ORM</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Local Depot:</span>
        <span class="meta-val">54-Stop Near MCB Bank, Dipalpur Road, Okara</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Proprietors:</span>
        <span class="meta-val">0306-9258573 / 0327-7497457</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Security Status:</span>
        <span class="meta-val" style="color: #10b981;">● Endpoints Hardened &amp; Rate-Limited</span>
      </div>
    </div>
  </div>
</body>
</html>`);
});

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
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/owner-brand', ownerBrandRoutes); // Confidential Admin-only owner brand module
app.use('/api/expenses', expenseRoutes); // Small business cashbook & expenses
app.use('/api/hr', employeeRoutes); // Employees, Attendance & Payroll

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
  });
}
