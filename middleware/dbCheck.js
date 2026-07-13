const mongoose = require('mongoose');
const connectDB = require('../config/db');

// Middleware to ensure database connection before processing requests
const ensureDbConnection = async (req, res, next) => {
  if (req.originalUrl.startsWith('/api/location')) {
    return next();
  }

  if (mongoose.connection.readyState !== 1) {
    try {
      await connectDB();
    } catch (error) {
      console.error('Database connection attempt failed in middleware:', error.message);
    }

    if (mongoose.connection.readyState !== 1) {
      console.error(
        `Database not ready. readyState=${mongoose.connection.readyState} route=${req.originalUrl}`
      );

      return res.status(503).json({
        success: false,
        message: 'Database connection not ready. Please try again.'
      });
    }
  }
  next();
};

module.exports = ensureDbConnection;
