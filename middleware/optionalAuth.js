const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Optional authentication middleware - works for both guests and authenticated users
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // If token exists, verify and attach user
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here');
        req.user = await User.findById(decoded.id).select('-password');
      } catch (error) {
        // Token invalid, continue as guest
        console.log('Invalid token, continuing as guest');
      }
    }

    // Continue regardless of authentication status
    next();
  } catch (error) {
    next();
  }
};

module.exports = { optionalAuth };
