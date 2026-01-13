const helmet = require('helmet');

// Configure helmet with custom options
const helmetConfig = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  
  // Cross-Origin-Embedder-Policy
  crossOriginEmbedderPolicy: false,
  
  // Cross-Origin-Opener-Policy
  crossOriginOpenerPolicy: { policy: "same-origin" },
  
  // Cross-Origin-Resource-Policy
  crossOriginResourcePolicy: { policy: "cross-origin" },
  
  // DNS Prefetch Control
  dnsPrefetchControl: { allow: false },
  
  // Expect-CT
  expectCt: {
    maxAge: 86400,
    enforce: true
  },
  
  // Frameguard (X-Frame-Options)
  frameguard: { action: "deny" },
  
  // Hide Powered-By header
  hidePoweredBy: true,
  
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  
  // IE No Open
  ieNoOpen: true,
  
  // No Sniff (X-Content-Type-Options)
  noSniff: true,
  
  // Permitted Cross-Domain Policies
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
  
  // Referrer Policy
  referrerPolicy: { policy: "no-referrer" },
  
  // X-XSS-Protection
  xssFilter: true
});

module.exports = helmetConfig;
