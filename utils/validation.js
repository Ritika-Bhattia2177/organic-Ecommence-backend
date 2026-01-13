const validator = require('validator');

// Sanitize user input to prevent XSS attacks
exports.sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return validator.escape(input.trim());
  }
  return input;
};

// Validate email
exports.validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return { isValid: false, message: 'Email is required' };
  }
  
  if (!validator.isEmail(email)) {
    return { isValid: false, message: 'Please provide a valid email address' };
  }
  
  return { isValid: true };
};

// Validate password strength
exports.validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { isValid: false, message: 'Password is required' };
  }
  
  if (password.length < 6) {
    return { isValid: false, message: 'Password must be at least 6 characters long' };
  }
  
  if (!validator.isStrongPassword(password, {
    minLength: 6,
    minLowercase: 1,
    minUppercase: 0,
    minNumbers: 1,
    minSymbols: 0
  })) {
    return { isValid: false, message: 'Password must contain at least one letter and one number' };
  }
  
  return { isValid: true };
};

// Validate phone number
exports.validatePhone = (phone) => {
  if (!phone) {
    return { isValid: true }; // Phone is optional
  }
  
  if (!validator.isMobilePhone(phone.toString(), 'any')) {
    return { isValid: false, message: 'Please provide a valid phone number' };
  }
  
  return { isValid: true };
};

// Validate MongoDB ObjectId
exports.validateObjectId = (id) => {
  if (!id) {
    return { isValid: false, message: 'ID is required' };
  }
  
  if (!validator.isMongoId(id.toString())) {
    return { isValid: false, message: 'Invalid ID format' };
  }
  
  return { isValid: true };
};

// Validate product data
exports.validateProduct = (data) => {
  const errors = [];
  
  if (!data.name || data.name.trim().length === 0) {
    errors.push('Product name is required');
  }
  
  if (!data.price || data.price <= 0) {
    errors.push('Valid product price is required');
  }
  
  if (!data.category || data.category.trim().length === 0) {
    errors.push('Product category is required');
  }
  
  if (!data.description || data.description.trim().length === 0) {
    errors.push('Product description is required');
  }
  
  if (data.stock !== undefined && data.stock < 0) {
    errors.push('Stock cannot be negative');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
};

// Validate order data
exports.validateOrder = (data) => {
  const errors = [];
  
  // Accept both 'products' and 'items' array
  const orderProducts = data.products || data.items;
  if (!orderProducts || !Array.isArray(orderProducts) || orderProducts.length === 0) {
    errors.push('Order must contain at least one product');
  }
  
  if (!data.totalAmount || data.totalAmount <= 0) {
    errors.push('Valid total amount is required');
  }
  
  // Accept both 'address' and 'shippingAddress' with flexible field names
  const addressData = data.address || data.shippingAddress;
  if (!addressData) {
    errors.push('Complete shipping address is required');
  } else {
    const street = addressData.street || addressData.address;
    const city = addressData.city;
    const state = addressData.state;
    const zipCode = addressData.zipCode || addressData.pincode;
    
    if (!street || !city || !state || !zipCode) {
      const missing = [];
      if (!street) missing.push('street address');
      if (!city) missing.push('city');
      if (!state) missing.push('state');
      if (!zipCode) missing.push('pincode/zipcode');
      errors.push(`Complete shipping address is required. Missing: ${missing.join(', ')}`);
    }
  }
  
  if (!data.paymentMethod) {
    errors.push('Payment method is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
};

// Middleware to validate request body
exports.validateRequest = (validationFn) => {
  return (req, res, next) => {
    const result = validationFn(req.body);
    
    if (!result.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: result.errors || [result.message]
      });
    }
    
    next();
  };
};

// Sanitize object recursively
exports.sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  const sanitized = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (typeof obj[key] === 'string') {
        sanitized[key] = validator.escape(obj[key].trim());
      } else if (typeof obj[key] === 'object') {
        sanitized[key] = exports.sanitizeObject(obj[key]);
      } else {
        sanitized[key] = obj[key];
      }
    }
  }
  
  return sanitized;
};
