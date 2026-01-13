const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// Protect routes - verify JWT token from header or cookie
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // Check for token in cookies
  else if (req.cookies.token) {
    token = req.cookies.token;
  }

  // Check if token exists
  if (!token) {
    const error = new Error('Not authorized to access this route');
    error.statusCode = 401;
    throw error;
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token (exclude password)
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    // Check if user is active
    if (!req.user.isActive) {
      const error = new Error('User account is deactivated');
      error.statusCode = 403;
      throw error;
    }

    next();
  } catch (err) {
    const error = new Error('Not authorized to access this route');
    error.statusCode = 401;
    throw error;
  }
});

// Admin middleware
exports.admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    const error = new Error('Not authorized as admin');
    error.statusCode = 403;
    throw error;
  }
};
