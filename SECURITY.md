# Backend Security Implementation

## Overview
This document outlines the security measures implemented in the OrganicMart backend API.

## Security Features

### 1. Helmet - HTTP Headers Security
**Location:** `config/security.js`

Helmet sets various HTTP headers to protect against common web vulnerabilities:

- **Content Security Policy (CSP)** - Prevents XSS attacks by controlling resource loading
- **X-Frame-Options** - Prevents clickjacking attacks (set to DENY)
- **Strict-Transport-Security (HSTS)** - Forces HTTPS connections
- **X-Content-Type-Options** - Prevents MIME type sniffing
- **X-XSS-Protection** - Enables browser XSS filtering
- **Referrer-Policy** - Controls referrer information (set to no-referrer)
- **Hide Powered-By** - Removes X-Powered-By header

### 2. Rate Limiting
**Location:** `middleware/rateLimiter.js`

Multiple rate limiters protect different endpoints:

#### API Limiter (General)
- Window: 15 minutes
- Max Requests: 100 per IP
- Applied to: All `/api/*` routes

#### Authentication Limiter
- Window: 15 minutes
- Max Attempts: 5 per IP
- Applied to: `/api/auth/register`, `/api/auth/login`
- Skips successful requests (only counts failures)

#### Order Creation Limiter
- Window: 1 hour
- Max Orders: 10 per IP
- Applied to: `/api/orders/create`

#### Password Reset Limiter
- Window: 1 hour
- Max Attempts: 3 per IP
- Applied to: Password reset endpoints

### 3. CORS (Cross-Origin Resource Sharing)
**Location:** `server.js`

Enhanced CORS configuration:
- **Allowed Origins:** Configurable via environment variables
- **Credentials:** Enabled for cookie-based authentication
- **Methods:** GET, POST, PUT, DELETE, PATCH, OPTIONS
- **Headers:** Content-Type, Authorization, X-Requested-With
- **Mobile/Tool Support:** Allows requests without origin (Postman, mobile apps)

### 4. Input Validation
**Location:** `utils/validation.js`

Comprehensive validation utilities:

#### Email Validation
- Checks email format using validator library
- Required field validation

#### Password Validation
- Minimum 6 characters
- Must contain at least one letter and one number
- Uses validator's strong password checker

#### Phone Validation
- Optional field
- International format support
- Uses validator's mobile phone checker

#### MongoDB ObjectId Validation
- Validates proper ObjectId format
- Prevents injection attacks

#### Product Validation
- Name, price, category, description required
- Price must be positive
- Stock cannot be negative

#### Order Validation
- Products array required and non-empty
- Valid total amount required
- Complete address validation
- Payment method required

#### Sanitization
- Recursive object sanitization
- XSS prevention using validator.escape()
- Trim whitespace from strings

### 5. NoSQL Injection Prevention
**Package:** `express-mongo-sanitize`
**Location:** `server.js`

- Removes `$` and `.` characters from user input
- Prevents MongoDB query injection attacks
- Applied to all request bodies automatically

### 6. Additional Security Measures

#### Request Size Limits
- JSON body limit: 10MB
- URL-encoded body limit: 10MB
- Prevents DOS attacks via large payloads

#### Cookie Security
- **httpOnly:** Prevents JavaScript access (XSS protection)
- **secure:** HTTPS-only in production
- **sameSite:** 'strict' for CSRF protection
- **maxAge:** 30 days expiration

#### Password Security
- Hashed using bcryptjs (in User model)
- Never returned in API responses
- Minimum strength requirements enforced

## Usage Examples

### Applying Validation to Routes

```javascript
const { validateRequest, validateProduct } = require('../utils/validation');

router.post('/products', 
  protect, 
  admin, 
  validateRequest(validateProduct), 
  createProduct
);
```

### Applying Rate Limiting

```javascript
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/login', authLimiter, login);
```

### Manual Validation in Controllers

```javascript
const { validateEmail, sanitizeInput } = require('../utils/validation');

// Validate email
const emailValidation = validateEmail(email);
if (!emailValidation.isValid) {
  throw new Error(emailValidation.message);
}

// Sanitize input
const sanitizedName = sanitizeInput(name);
```

## Environment Variables

Required security-related environment variables:

```env
# General
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com

# JWT
JWT_SECRET=your_super_secret_jwt_key

# Session
SESSION_SECRET=your_session_secret
```

## Best Practices

1. **Always validate user input** before processing
2. **Sanitize data** before storing in database
3. **Use HTTPS** in production (set NODE_ENV=production)
4. **Keep dependencies updated** to patch security vulnerabilities
5. **Monitor rate limit hits** to detect potential attacks
6. **Use strong JWT secrets** (minimum 32 characters)
7. **Implement proper error handling** (don't expose system details)
8. **Log security events** for audit trails

## Testing Security

### Test Rate Limiting
```bash
# Send multiple requests to test rate limiter
for i in {1..10}; do curl -X POST http://localhost:5000/api/auth/login; done
```

### Test Input Validation
```bash
# Try invalid email
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"invalid","password":"test123"}'

# Try weak password
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"123"}'
```

### Test NoSQL Injection
```bash
# Try MongoDB injection
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":{"$gt":""},"password":{"$gt":""}}'
```

## Security Checklist

- [x] Helmet for HTTP headers
- [x] Rate limiting on all API routes
- [x] Rate limiting on authentication routes
- [x] CORS configuration
- [x] Input validation
- [x] Input sanitization
- [x] NoSQL injection prevention
- [x] Password strength validation
- [x] Email validation
- [x] Request size limits
- [x] Secure cookies
- [x] Password hashing
- [x] Error handling

## Future Enhancements

Consider implementing:
- [ ] Two-factor authentication (2FA)
- [ ] IP whitelisting for admin routes
- [ ] Request logging and monitoring
- [ ] Intrusion detection system
- [ ] API key authentication for third-party integrations
- [ ] Content encryption at rest
- [ ] Security headers testing (securityheaders.com)
- [ ] Regular security audits
- [ ] Automated dependency vulnerability scanning
