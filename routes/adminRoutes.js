const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');

// Import controllers
const { getUsers, getUserById, deleteUser, getAdminStats } = require('../controllers/userController');
const { getOrders, updateOrderStatus } = require('../controllers/orderController');
const { createProduct, updateProduct, deleteProduct } = require('../controllers/productController');

// ============= DASHBOARD =============
// @desc    Get admin dashboard statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
router.get('/stats', protect, admin, getAdminStats);

// ============= USER MANAGEMENT =============
// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
router.get('/users', protect, admin, getUsers);

// @desc    Get user by ID
// @route   GET /api/admin/users/:id
// @access  Private/Admin
router.get('/users/:id', protect, admin, getUserById);

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
router.delete('/users/:id', protect, admin, deleteUser);

// ============= ORDER MANAGEMENT =============
// @desc    Get all orders (with optional status filter)
// @route   GET /api/admin/orders?status=pending
// @access  Private/Admin
router.get('/orders', protect, admin, getOrders);

// @desc    Update order status
// @route   PUT /api/admin/orders/:id/status
// @access  Private/Admin
router.put('/orders/:id/status', protect, admin, updateOrderStatus);

// ============= PRODUCT MANAGEMENT =============
// @desc    Add new product
// @route   POST /api/admin/products
// @access  Private/Admin
router.post('/products', protect, admin, createProduct);

// @desc    Update product
// @route   PUT /api/admin/products/:id
// @access  Private/Admin
router.put('/products/:id', protect, admin, updateProduct);

// @desc    Delete product
// @route   DELETE /api/admin/products/:id
// @access  Private/Admin
router.delete('/products/:id', protect, admin, deleteProduct);

module.exports = router;
