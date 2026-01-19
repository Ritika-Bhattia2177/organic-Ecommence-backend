const express = require('express');
const router = express.Router();
const passport = require('passport');
const { 
  register, 
  login, 
  googleAuth,
  googleCallback,
  getProfile, 
  logout 
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');

// Public routes with rate limiting
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/google', authLimiter, googleAuth);

// Google OAuth routes
router.get('/google', 
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false,
    accessType: 'offline',
    prompt: 'consent'
  })
);

router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: (req, res) => {
      const errorUrl = req.query.error || 'google_auth_failed';
      const redirectUrl = process.env.NODE_ENV === 'production'
        ? `https://frontend-lemon-ten-90.vercel.app/login?error=${errorUrl}`
        : `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=${errorUrl}`;
      return res.redirect(redirectUrl);
    },
    session: false 
  }),
  googleCallback
);

// Protected routes
router.get('/profile', protect, getProfile);
router.post('/logout', protect, logout);

module.exports = router;
