import rateLimit from 'express-rate-limit';

/**
 * Strict rate limiter for authentication & confidential endpoints.
 * Protects against brute-force password cracking and credential stuffing.
 * Allows maximum 10 requests per 15 minutes per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 15 login / verification attempts per window
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP address. Please try again after 15 minutes.',
  },
});

/**
 * Password change rate limiter.
 * Allows maximum 6 attempts per 15 minutes per IP.
 */
export const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 6,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password update requests. Please wait 15 minutes before retrying.',
  },
});

/**
 * Public form submission rate limiter.
 * Protects public inquiries (/contact) and public order placement (/orders)
 * against automated spam bots, flooding, and resource exhaustion.
 * Allows 20 requests per 15 minutes per IP.
 */
export const publicSubmissionsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
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
 * Allows up to 600 requests per 15 minutes per IP.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'High traffic detected from your IP address. Please slow down your requests.',
  },
});
