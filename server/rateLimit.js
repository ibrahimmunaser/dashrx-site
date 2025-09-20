const rateLimit = require('express-rate-limit');

/**
 * Rate limiting configuration for API endpoints
 * Prevents abuse and protects against spam
 */

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 5, // 5 requests per window
  message: {
    error: 'Too many requests from this IP. Please try again in a minute.',
    retryAfter: 60
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for static assets
    return req.url.startsWith('/favicon') || 
           req.url.startsWith('/robots') || 
           req.url.startsWith('/sitemap');
  }
});

// Stricter rate limit for quote form submissions
const quoteLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 3, // 3 quote requests per minute per IP
  message: {
    error: 'Too many quote requests. Please wait a minute before submitting again.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false
});

module.exports = {
  apiLimiter,
  quoteLimiter
};
