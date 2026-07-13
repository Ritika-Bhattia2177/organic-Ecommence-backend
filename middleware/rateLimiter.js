const rateLimit = require('express-rate-limit');

const commonConfig = {
  standardHeaders: true,
  legacyHeaders: false,

  // Prevent Vercel proxy validation error
  validate: {
    xForwardedForHeader: false,
  },
};

// General API limiter
exports.apiLimiter = rateLimit({
  ...commonConfig,
  windowMs: 15 * 60 * 1000,
  max: 10000,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
});

// Authentication limiter
exports.authLimiter = rateLimit({
  ...commonConfig,
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes',
  },
});

// Order limiter
exports.createOrderLimiter = rateLimit({
  ...commonConfig,
  windowMs: 60 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many orders created, please try again later',
  },
});

// Password reset limiter
exports.passwordResetLimiter = rateLimit({
  ...commonConfig,
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again later',
  },
});