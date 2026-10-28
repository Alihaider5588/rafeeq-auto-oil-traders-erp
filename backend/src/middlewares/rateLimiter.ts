import rateLimit from 'express-rate-limit';

/**
 * Strict rate limiter for authentication & confidential endpoints.
 * Protects against brute-force password cracking and credential stuffing.
 * Allows maximum 30 failed attempts per 15 minutes per IP.
 * Crucial Safeguard: Successful logins are NEVER blocked, and local POS terminals are whitelisted.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // Limit each IP to 60 failed attempts per window
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skipSuccessfulRequests: true, // Legitimate successful logins NEVER consume attempts
  skip: (req) => {
    // Whitelist localhost & loopback so shop counter terminal never gets locked out
    const ip = req.ip || req.socket?.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  },
  message: {
    success: false,
    message: 'Too many failed login attempts from this IP address. Please wait a few minutes before retrying.',
  },
});

/**
 * Password change rate limiter.
 * Allows maximum 20 attempts per 15 minutes per IP.
 */
export const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password update requests. Please wait a few minutes before retrying.',
  },
});

/**
 * Public form submission rate limiter.
 * Protects public inquiries (/contact) and public order placement (/orders)
 * against automated spam bots, flooding, and resource exhaustion.
 * Allows 50 requests per 15 minutes per IP.
 */
export const publicSubmissionsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many public requests sent from this IP. Please wait a few minutes before submitting again.',
  },
});

/**
 * General API rate limiter.
 * Protects the entire application against scraping, automated probing, and DoS attacks.
 * Allows up to 1500 requests per 15 minutes per IP.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'High traffic detected from your IP address. Please slow down your requests.',
  },
});
