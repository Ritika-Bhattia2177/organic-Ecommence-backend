const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const { validateEmail, validatePassword, sanitizeInput } = require('../utils/validation');

// Helper function to send token response with cookie
const sendTokenResponse = (user, statusCode, res) => {
  // Generate JWT token
  const token = user.generateToken();

  // Cookie options
  const options = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    httpOnly: true, // Prevents XSS attacks
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict' // CSRF protection
  };

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res) => {
  try {
    const { name, email, password } = req.body;

    console.log('📝 Registration attempt:', { name, email });

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Validate email format
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: emailValidation.message
      });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }

    // Sanitize name input
    const sanitizedName = sanitizeInput(name);

    // Check if user already exists
    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create user
    const user = await User.create({
      name: sanitizedName,
      email: email.toLowerCase(),
      password
    });

    console.log('✅ User created successfully:', user.email);

    // Send token response with cookie
    sendTokenResponse(user, 201, res);
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Registration failed. Please try again.'
    });
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    const error = new Error('Please provide email and password');
    error.statusCode = 400;
    throw error;
  }

  // Validate email format
  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    const error = new Error(emailValidation.message);
    error.statusCode = 400;
    throw error;
  }

  // Check for user with password field
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }

  // Check if user is active
  if (!user.isActive) {
    const error = new Error('Your account has been deactivated');
    error.statusCode = 403;
    throw error;
  }

  // Check if password matches
  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }

  // Send token response with cookie
  sendTokenResponse(user, 200, res);
});

// @desc    Google OAuth authentication
// @route   POST /api/auth/google
// @access  Public
exports.googleAuth = asyncHandler(async (req, res) => {
  const { googleId, email, name } = req.body;

  // Validate input
  if (!googleId || !email || !name) {
    const error = new Error('Please provide all required Google OAuth fields');
    error.statusCode = 400;
    throw error;
  }

  // Check if user exists with googleId
  let user = await User.findOne({ googleId });

  if (!user) {
    // Check if user exists with email
    user = await User.findOne({ email });

    if (user) {
      // Link Google account to existing user
      user.googleId = googleId;
      await user.save();
    } else {
      // Create new user
      user = await User.create({
        name,
        email,
        googleId
      });
    }
  }

  // Check if user is active
  if (!user.isActive) {
    const error = new Error('Your account has been deactivated');
    error.statusCode = 403;
    throw error;
  }

  // Send token response with cookie
  sendTokenResponse(user, 200, res);
});

// @desc    Google OAuth callback handler
// @route   GET /api/auth/google/callback
// @access  Public
exports.googleCallback = asyncHandler(async (req, res) => {
  // User is authenticated by passport and available in req.user
  if (!req.user) {
    const error = new Error('Google authentication failed');
    error.statusCode = 401;
    throw error;
  }

  // Generate JWT token
  const token = req.user.generateToken();

  // Cookie options
  const cookieOptions = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' // Changed from 'strict' to 'lax' for cross-site redirects
  };

  // Set cookie
  res.cookie('token', token, cookieOptions);

  // Redirect to frontend with token - use production URL in production
  const frontendUrl = process.env.NODE_ENV === 'production' 
    ? 'https://frontend-lemon-ten-90.vercel.app'
    : (process.env.FRONTEND_URL || 'http://localhost:5173');
  
  const redirectUrl = `${frontendUrl}/auth/google/success?token=${token}`;
  res.redirect(redirectUrl);
});

// @desc    Get current logged in user profile
// @route   GET /api/auth/profile
// @access  Private
exports.getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Logout user (clear cookie)
// @route   POST /api/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res) => {
  // Clear cookie
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 1 * 1000), // Expire in 1 second
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    message: 'User logged out successfully'
  });
});

module.exports = exports;
