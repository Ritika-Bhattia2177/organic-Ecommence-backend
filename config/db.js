const mongoose = require('mongoose');

let connectionPromise = null;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  console.log('===== CONNECT DB START =====');
  console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);

  const options = {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 20000,
    family: 4,
    maxPoolSize: 10,
    retryWrites: true,
    w: 'majority',
    connectTimeoutMS: 10000,
  };

  connectionPromise = mongoose.connect(process.env.MONGODB_URI, options)
    .then((conn) => {
      console.log('MongoDB Connected');
      console.log(conn.connection.host);
      console.log(conn.connection.name);
      return conn;
    })
    .catch((error) => {
      console.error('DATABASE ERROR:');
      console.error(error);
      throw error;
    })
    .finally(() => {
      connectionPromise = null;
    });

  mongoose.connection.on('connected', () => {
    console.log('✅ Mongoose connected to MongoDB');
  });

  mongoose.connection.on('error', (err) => {
    console.error(`❌ Mongoose connection error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  Mongoose disconnected from MongoDB');
  });

  process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('🛑 Mongoose connection closed due to app termination');
    process.exit(0);
  });

  return connectionPromise;
};

module.exports = connectDB;
