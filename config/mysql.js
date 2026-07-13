const mysql = require('mysql2/promise');

let pool = null;
let locationTableReady = false;

const getMySQLPool = () => {
  if (pool) {
    return pool;
  }

  pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'organicmart',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    namedPlaceholders: false,
  });

  return pool;
};

const ensureLocationTable = async () => {
  if (locationTableReady) {
    return;
  }

  const dbPool = getMySQLPool();

  await dbPool.execute(`
    CREATE TABLE IF NOT EXISTS order_locations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id VARCHAR(255) NOT NULL,
      latitude DECIMAL(10, 8) NOT NULL,
      longitude DECIMAL(11, 8) NOT NULL,
      location_timestamp DATETIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  locationTableReady = true;
};

module.exports = {
  getMySQLPool,
  ensureLocationTable,
};