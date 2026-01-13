const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrderById,
  getMyOrders,
  getOrders,
  updateOrderStatus,
  trackOrder
} = require('../controllers/orderController');
const { protect, admin } = require('../middleware/authMiddleware');
const { createOrderLimiter } = require('../middleware/rateLimiter');
const { validateRequest, validateOrder } = require('../utils/validation');

router.route('/create')
  .post(protect, createOrderLimiter, validateRequest(validateOrder), createOrder);

router.route('/my')
  .get(protect, getMyOrders);

router.route('/')
  .get(protect, admin, getOrders);

router.route('/:id')
  .get(protect, getOrderById);

router.route('/:id/status')
  .put(protect, admin, updateOrderStatus);

router.route('/:id/track')
  .get(protect, trackOrder);

module.exports = router;
