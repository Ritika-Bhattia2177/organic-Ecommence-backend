const mongoose = require('mongoose');

// Middleware to ensure database connection before processing requests
const ensureDbConnection = async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    // If not connected, wait a bit and check again
    let attempts = 0;
    const maxAttempts = 10;
    
    while (mongoose.connection.readyState !== 1 && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection not ready. Please try again.'
      });
    }
  }
  next();
};

module.exports = ensureDbConnection;
