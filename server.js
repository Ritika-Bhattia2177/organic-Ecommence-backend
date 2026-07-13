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

// =====================================================
// EXPRESS APP
// =====================================================

const app = express();
const server = http.createServer(app);

// Required for Vercel / Render / Railway
app.set('trust proxy', 1);

// Hide Express signature
app.disable('x-powered-by');

// =====================================================
// DATABASE
// =====================================================

try {
  connectDB().catch((err) => {
    console.error('Database Connection Error:', err.message);
  });
} catch (err) {
  console.error('Database Connection Error:', err.message);
}

// =====================================================
// PASSPORT
// =====================================================

try {
  require('./config/passport')(passport);
} catch (err) {
  console.error('Passport Error:', err.message);
}

// =====================================================
// ALLOWED ORIGINS
// =====================================================

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
      .flatMap(origin => origin ? origin.split(',') : [])
      .map(origin => origin.trim())
      .filter(Boolean)
  )
);

// =====================================================
// CORS
// =====================================================

const corsOptions = {
  origin(origin, callback) {

    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log(`Blocked Origin: ${origin}`);

    return callback(new Error(`CORS blocked for ${origin}`));
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
    'Accept',
    'X-Requested-With'
  ],

  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

app.options('*', cors(corsOptions));

// =====================================================
// SECURITY
// =====================================================

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

// =====================================================
// RATE LIMITER
// =====================================================

app.use('/api', apiLimiter);

// =====================================================
// SESSION
// =====================================================

app.use(session({

  secret: process.env.SESSION_SECRET || 'secret',

  resave: false,

  saveUninitialized: false,

  store: MongoStore.create({

    mongoUrl: process.env.MONGODB_URI,

    collectionName: 'sessions'

  }),

  cookie: {

    secure: process.env.NODE_ENV === 'production',

    httpOnly: true,

    sameSite: 'lax',

    maxAge: 24 * 60 * 60 * 1000

  }

}));

// =====================================================
// PASSPORT
// =====================================================

app.use(passport.initialize());

app.use(passport.session());

// =====================================================
// DATABASE CHECK
// =====================================================

app.use('/api', ensureDbConnection);

// =====================================================
// LOGGER
// =====================================================

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// =====================================================
// ROUTES
// =====================================================

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/location', require('./routes/locationRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// =====================================================
// SOCKET.IO
// =====================================================

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

setIo(io);

io.on('connection', socket => {

  console.log(`Socket Connected: ${socket.id}`);

  registerSocketHandlers(socket);

  socket.on('disconnect', () => {

    console.log(`Socket Disconnected: ${socket.id}`);

  });

});

// =====================================================
// ROOT ROUTE
// =====================================================

app.get('/', (req, res) => {

  res.status(200).json({

    success: true,

    message: 'OrganicMart Backend is Running 🚀'

  });

});

// =====================================================
// HEALTH ROUTE
// =====================================================

app.get('/api/health', (req, res) => {

  res.status(200).json({

    success: true,

    message: 'OrganicMart API is running',

    timestamp: new Date().toISOString()

  });

});

// =====================================================
// FAVICON
// =====================================================

app.get('/favicon.ico', (req, res) => {

  res.status(204).end();

});

// =====================================================
// 404
// =====================================================

app.use((req, res, next) => {

  const error = new Error(`Route not found - ${req.originalUrl}`);

  error.statusCode = 404;

  next(error);

});

// =====================================================
// ERROR HANDLER
// =====================================================

app.use(errorHandler);

// =====================================================
// START SERVER
// =====================================================

const PORT = process.env.PORT || 5000;

if (!process.env.VERCEL) {

  server.listen(PORT, () => {

    console.log(`🚀 Server running on port ${PORT}`);

  });

}

// =====================================================
// UNHANDLED PROMISES
// =====================================================

process.on('unhandledRejection', err => {

  console.error('Unhandled Rejection:', err);

});

// =====================================================
// EXPORT
// =====================================================

module.exports = app;