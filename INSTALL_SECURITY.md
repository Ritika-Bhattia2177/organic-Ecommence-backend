# Security Packages Installation

## Install the required security packages:

```bash
npm install helmet express-rate-limit express-mongo-sanitize
```

## Package Details

### helmet (v7.1.0)
- Sets secure HTTP headers
- Protects against common vulnerabilities
- Configurable security policies

### express-rate-limit (v7.1.5)
- Rate limiting middleware
- Prevents brute force attacks
- Customizable per route

### express-mongo-sanitize (v2.2.0)
- Sanitizes user input
- Prevents NoSQL injection
- Removes prohibited characters

## Already Installed

### validator (v13.11.0)
- Input validation library
- Email, phone, URL validation
- XSS sanitization

## Verify Installation

Check package.json to ensure all packages are listed in dependencies.

## Start Server

After installation, start the server:

```bash
npm run dev
```

The server will now have all security features enabled.
