const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const passport = require('passport');
const mongoSanitize = require('express-mongo-sanitize');
const http = require('http');
const { Server } = require('socket.io');

const helmetConfig = require('./config/security');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const ensureDbConnection = require('./middleware/dbCheck');
const { setIo, registerSocketHandlers } = require('./utils/socket');

dotenv.config();

// ========================================
// Express App
// ========================================

const app = express();
const server = http.createServer(app);

// IMPORTANT FOR VERCEL
app.set('trust proxy', 1);

// ========================================
// Allowed Origins
// ========================================

const allowedOrigins = Array.from(
  new Set(
    [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      process.env.FRONTEND_URL,
      process.env.CORS_ORIGINS
    ]
      .flatMap(item => (item ? item.split(',') : []))
      .map(item => item.trim())
      .filter(Boolean)
  )
);

// ========================================
// CORS
// ========================================

app.use(cors({
  origin(origin, callback) {

    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked: ${origin}`));
  },

  credentials: true,

  methods: [
    'GET',
    'POST',
    'PUT',
    'DELETE',
    'PATCH',
    'OPTIONS'
  ],

  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept'
  ]
}));

app.options('*', cors());

// ========================================
// MongoDB
// ========================================

try {
  connectDB();
} catch (err) {
  console.error(err);
}

// ========================================
// Passport
// ========================================

try {
  require('./config/passport')(passport);
} catch (err) {
  console.error(err);
}

// ========================================
// Middleware
// ========================================

app.use(helmetConfig);

app.use(express.json({
  limit: '10mb'
}));

app.use(express.urlencoded({
  extended: true,
  limit: '10mb'
}));

app.use(cookieParser());

app.use(mongoSanitize());

// ========================================
// Rate Limiter
// ========================================

app.use('/api', apiLimiter);

// ========================================
// Session
// ========================================

app.use(session({

  secret:
    process.env.SESSION_SECRET ||
    'secret',

  resave: false,

  saveUninitialized: false,

  store: MongoStore.create({

    mongoUrl: process.env.MONGODB_URI,

    collectionName: 'sessions'

  }),

  cookie: {

    secure: process.env.NODE_ENV === 'production',

    httpOnly: true,

    maxAge: 24 * 60 * 60 * 1000

  }

}));

// ========================================
// Passport Middleware
// ========================================

app.use(passport.initialize());

app.use(passport.session());

// ========================================
// DB Check
// ========================================

app.use('/api', ensureDbConnection);

// ========================================
// Morgan
// ========================================

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ========================================
// Routes
// ========================================

app.use('/api/auth', require('./routes/authRoutes'));

app.use('/api/users', require('./routes/userRoutes'));

app.use('/api/products', require('./routes/productRoutes'));

app.use('/api/location', require('./routes/locationRoutes'));

app.use('/api/orders', require('./routes/orderRoutes'));

app.use('/api/categories', require('./routes/categoryRoutes'));

app.use('/api/cart', require('./routes/cartRoutes'));

app.use('/api/admin', require('./routes/adminRoutes'));

// ========================================
// Socket.IO
// ========================================

const io = new Server(server, {

  cors: {

    origin: allowedOrigins,

    credentials: true

  }

});

setIo(io);

io.on('connection', socket => {

  console.log('Socket Connected', socket.id);

  registerSocketHandlers(socket);

  socket.on('disconnect', () => {

    console.log('Socket Disconnected');

  });

});

// ========================================
// Root
// ========================================

app.get('/', (req, res) => {

  res.json({

    success: true,

    message: 'OrganicMart Backend is Running 🚀'

  });

});

// ========================================
// Health
// ========================================

app.get('/api/health', (req, res) => {

  res.json({

    success: true,

    message: 'OrganicMart API is running',

    timestamp: new Date().toISOString()

  });

});

// ========================================
// favicon
// ========================================

app.get('/favicon.ico', (req, res) => {

  res.status(204).end();

});

// ========================================
// 404
// ========================================

app.use((req, res, next) => {

  const error = new Error(`Route not found - ${req.originalUrl}`);

  error.statusCode = 404;

  next(error);

});

// ========================================
// Error Handler
// ========================================

app.use(errorHandler);

// ========================================
// Local Server Only
// ========================================

const PORT = process.env.PORT || 5000;

if (process.env.VERCEL !== '1') {

  server.listen(PORT, () => {

    console.log(`Server running on ${PORT}`);

  });

}

process.on('unhandledRejection', err => {

  console.error(err);

});

module.exports = app;