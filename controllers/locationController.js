const asyncHandler = require('express-async-handler');
const { getMySQLPool, ensureLocationTable } = require('../config/mysql');
const { emitLocationReceive } = require('../utils/socket');
const Order = require('../models/Order');

exports.updateLocation = asyncHandler(async (req, res) => {
  const { orderId, latitude, longitude, timestamp } = req.body;

  if (!orderId || latitude === undefined || longitude === undefined) {
    return res.status(400).json({
      success: false,
      message: 'orderId, latitude, and longitude are required',
    });
  }

  const latitudeNumber = Number(latitude);
  const longitudeNumber = Number(longitude);
  const recordedAt = timestamp ? new Date(timestamp) : new Date();

  if (Number.isNaN(latitudeNumber) || Number.isNaN(longitudeNumber)) {
    return res.status(400).json({
      success: false,
      message: 'latitude and longitude must be valid numbers',
    });
  }

  if (Number.isNaN(recordedAt.getTime())) {
    return res.status(400).json({
      success: false,
      message: 'timestamp must be a valid date or date string',
    });
  }

  await ensureLocationTable();

  const pool = getMySQLPool();
  const [result] = await pool.execute(
    'INSERT INTO order_locations (order_id, latitude, longitude, location_timestamp) VALUES (?, ?, ?, ?)',
    [String(orderId), latitudeNumber, longitudeNumber, recordedAt]
  );

  emitLocationReceive({
    orderId: String(orderId),
    latitude: latitudeNumber,
    longitude: longitudeNumber,
    timestamp: recordedAt.toISOString(),
    source: 'http',
  });

  res.status(201).json({
    success: true,
    message: 'Location saved successfully',
    data: {
      id: result.insertId,
      orderId: String(orderId),
      latitude: latitudeNumber,
      longitude: longitudeNumber,
      timestamp: recordedAt.toISOString(),
    },
  });
});

exports.getLatestLocationByOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  if (!orderId) {
    return res.status(400).json({
      success: false,
      message: 'orderId is required',
    });
  }

  const order = await Order.findById(orderId).select('userId');

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found',
    });
  }

  if (order.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this order location',
    });
  }

  await ensureLocationTable();
  const pool = getMySQLPool();

  const [rows] = await pool.execute(
    `SELECT order_id, latitude, longitude, location_timestamp
     FROM order_locations
     WHERE order_id = ?
     ORDER BY location_timestamp DESC
     LIMIT 1`,
    [String(orderId)]
  );

  if (!rows || rows.length === 0) {
    return res.status(200).json({
      success: true,
      data: null,
      message: 'No location updates found for this order yet',
    });
  }

  const latest = rows[0];

  res.status(200).json({
    success: true,
    data: {
      orderId: latest.order_id,
      latitude: Number(latest.latitude),
      longitude: Number(latest.longitude),
      timestamp: latest.location_timestamp,
      source: 'mysql',
    },
  });
});