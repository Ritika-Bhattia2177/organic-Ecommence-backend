const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = asyncHandler(async (req, res) => {
  const { page, limit, search, role } = req.query;

  let query = {};

  // Search by name or email
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  // Filter by role
  if (role) {
    query.role = role;
  }

  // Pagination
  const pageNumber = parseInt(page, 10) || 1;
  const pageSize = parseInt(limit, 10) || 10;
  const skip = (pageNumber - 1) * pageSize;

  const totalUsers = await User.countDocuments(query);
  const users = await User.find(query)
    .select('-password')
    .skip(skip)
    .limit(pageSize)
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: users.length,
    total: totalUsers,
    page: pageNumber,
    pages: Math.ceil(totalUsers / pageSize),
    data: users
  });
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  user.name = req.body.name || user.name;
  user.email = req.body.email || user.email;
  user.phone = req.body.phone || user.phone;
  
  if (req.body.address) {
    user.address = { ...user.address, ...req.body.address };
  }

  if (req.body.password) {
    user.password = req.body.password;
  }

  const updatedUser = await user.save();

  res.status(200).json({
    success: true,
    data: {
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      phone: updatedUser.phone,
      address: updatedUser.address,
      token: updatedUser.generateToken()
    }
  });
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  await user.deleteOne();

  res.status(200).json({
    success: true,
    message: 'User deleted successfully'
  });
});

// @desc    Get admin dashboard statistics
// @route   GET /api/users/admin/stats
// @access  Private/Admin
exports.getAdminStats = asyncHandler(async (req, res) => {
  const User = require('../models/User');
  const Order = require('../models/Order');
  const Product = require('../models/Product');

  // Get user statistics
  const totalUsers = await User.countDocuments();
  const activeUsers = await User.countDocuments({ isActive: true });

  // Get order statistics
  const totalOrders = await Order.countDocuments();
  const pendingOrders = await Order.countDocuments({ status: 'pending' });
  const shippedOrders = await Order.countDocuments({ status: 'shipped' });
  const deliveredOrders = await Order.countDocuments({ status: 'delivered' });

  // Get total revenue
  const revenueData = await Order.aggregate([
    { $match: { status: { $in: ['delivered', 'shipped'] } } },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } }
  ]);
  const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;

  // Get product statistics
  const totalProducts = await Product.countDocuments();
  const outOfStock = await Product.countDocuments({ stock: 0 });

  // Recent orders
  const recentOrders = await Order.find()
    .populate('userId', 'name email')
    .sort('-createdAt')
    .limit(5)
    .select('totalAmount status createdAt');

  res.status(200).json({
    success: true,
    data: {
      users: {
        total: totalUsers,
        active: activeUsers
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        shipped: shippedOrders,
        delivered: deliveredOrders
      },
      revenue: {
        total: totalRevenue
      },
      products: {
        total: totalProducts,
        outOfStock: outOfStock
      },
      recentOrders
    }
  });
});
