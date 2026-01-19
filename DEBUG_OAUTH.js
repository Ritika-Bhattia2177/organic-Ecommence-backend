#!/usr/bin/env node

/**
 * OAuth Configuration Debugger
 * Run this before testing Google login to verify all settings
 */

const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

console.log('\n========================================');
console.log('🔍 GOOGLE OAUTH CONFIGURATION DEBUG');
console.log('========================================\n');

const checks = {
  CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? '✅ SET' : '❌ MISSING',
  CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,
  FRONTEND_URL: process.env.FRONTEND_URL,
  NODE_ENV: process.env.NODE_ENV || 'development',
};

console.log('📋 Current Configuration:\n');
Object.entries(checks).forEach(([key, value]) => {
  if (typeof value === 'string' && value.length > 50) {
    console.log(`   ${key}: ${value.substring(0, 40)}...`);
  } else {
    console.log(`   ${key}: ${value}`);
  }
});

console.log('\n========================================');
console.log('✅ REQUIRED GOOGLE CLOUD CONSOLE SETUP');
console.log('========================================\n');

console.log('📍 Add to "Authorized redirect URIs":');
console.log(`   ✓ ${process.env.GOOGLE_CALLBACK_URL}\n`);

console.log('📍 Add to "Authorized JavaScript origins":');
console.log(`   ✓ ${process.env.FRONTEND_URL}`);
console.log(`   ✓ http://localhost:5000\n`);

console.log('========================================');
console.log('🧪 VERIFICATION CHECKLIST');
console.log('========================================\n');

const checklist = [
  {
    step: 1,
    task: 'Backend running on port 5000',
    command: 'npm start (in backend folder)'
  },
  {
    step: 2,
    task: 'Frontend running on port 5173',
    command: 'npm run dev (in frontend folder)'
  },
  {
    step: 3,
    task: 'Google Cloud Console URIs updated',
    url: 'https://console.cloud.google.com/apis/credentials'
  },
  {
    step: 4,
    task: 'Test redirect URI: Click "Continue with Google"',
    url: 'http://localhost:5173/login'
  },
  {
    step: 5,
    task: 'Check browser console for errors',
    note: 'Press F12 to open DevTools'
  }
];

checklist.forEach(item => {
  console.log(`Step ${item.step}: ${item.task}`);
  if (item.command) console.log(`   Command: ${item.command}`);
  if (item.url) console.log(`   URL: ${item.url}`);
  if (item.note) console.log(`   Note: ${item.note}`);
  console.log();
});

console.log('========================================');
console.log('🚨 COMMON ERRORS & SOLUTIONS');
console.log('========================================\n');

const errors = [
  {
    error: 'Error 400: redirect_uri_mismatch',
    solution: 'The callback URL in Google Console does NOT match your .env GOOGLE_CALLBACK_URL\nSolution: Go to Google Console and add: ' + process.env.GOOGLE_CALLBACK_URL
  },
  {
    error: 'Unauthorized (401)',
    solution: 'Your CLIENT_ID or CLIENT_SECRET is wrong\nSolution: Copy them again from Google Console APIs & Services > Credentials'
  },
  {
    error: 'CORS error / blocked by CORS policy',
    solution: 'Frontend origin not added to Google Console\nSolution: Add http://localhost:5173 to "Authorized JavaScript origins"'
  },
  {
    error: 'Stuck on loading / redirect loop',
    solution: 'Session/Passport issue\nSolution: Clear browser cache/cookies and restart both servers'
  }
];

errors.forEach((err, idx) => {
  console.log(`❌ ${idx + 1}. ${err.error}`);
  console.log(`   ✅ ${err.solution}\n`);
});

console.log('========================================\n');
