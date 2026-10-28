/**
 * Security & Cryptography Utilities
 * Centralizes JWT secret retrieval, origin validation, and security safeguards.
 */

const FALLBACK_SECRET = 'rafeeque_super_secure_jwt_secret_token_key_2026_oil_traders';

/**
 * Retrieves the application JWT secret key.
 * Enforces security in production environments.
 */
export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim() === '') {
    if (process.env.NODE_ENV === 'production') {
      console.error('================================================================');
      console.error('SECURITY WARNING: JWT_SECRET environment variable is missing in production!');
      console.error('Using default fallback secret. Set a strong random JWT_SECRET in environment variables.');
      console.error('================================================================');
    }
    return FALLBACK_SECRET;
  }
  return secret.trim();
};

/**
 * Returns the list of permitted CORS origins.
 * Whitelists the production frontend, localhost development servers,
 * and any additional origins configured via FRONTEND_URL or CORS_ALLOWED_ORIGINS.
 */
export const getAllowedCorsOrigins = (): (string | RegExp)[] => {
  const origins: (string | RegExp)[] = [
    // Production frontends on Vercel
    'https://rafeeq-auto-oil-traders-erp-fr1b.vercel.app',
    'https://rafeeq-auto-oil-traders-erp.vercel.app',
    /\.vercel\.app$/,
    // Local development servers
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    // Local Area Network (Wi-Fi / LAN IP addresses for mobile devices & terminals)
    /^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/,
  ];

  if (process.env.FRONTEND_URL) {
    const urls = process.env.FRONTEND_URL.split(',').map((u) => u.trim()).filter(Boolean);
    urls.forEach((u) => {
      if (!origins.includes(u)) {
        origins.push(u);
      }
    });
  }

  if (process.env.CORS_ALLOWED_ORIGINS) {
    const customOrigins = process.env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
    customOrigins.forEach((o) => {
      if (!origins.includes(o)) {
        origins.push(o);
      }
    });
  }

  return origins;
};
