const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

// @desc    Create new order
// @route   POST /api/orders/create
// @access  Private
exports.createOrder = asyncHandler(async (req, res) => {
  const fs = require('fs');
  const debugData = {
    timestamp: new Date().toISOString(),
    body: req.body,
    user: req.user?._id
  };
  fs.appendFileSync('/tmp/order-debug.log', JSON.stringify(debugData, null, 2) + '\n\n');
  
  console.log('\n\n========== NEW ORDER REQUEST ==========');
  console.log('📦 Order creation request received');
  console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
  console.log('👤 User:', req.user?._id);
  console.log('========================================\n');
  
  // Support both formats: items/products, shippingAddress/address
  let { items, products, totalAmount, shippingAddress, address, paymentMethod } = req.body;
  
  // Normalize items/products
  const orderItems = items || products;
  
  // Normalize address
  const orderAddress = shippingAddress || address;

  console.log('📦 Order items:', JSON.stringify(orderItems, null, 2));
  console.log('📦 Order address:', JSON.stringify(orderAddress, null, 2));
  console.log('📦 Total amount:', totalAmount);
  console.log('📦 Payment method:', paymentMethod);

  if (!orderItems || orderItems.length === 0) {
    console.error('❌ No products in order');
    return res.status(400).json({
      success: false,
      message: 'Order must contain at least one product',
      errors: ['Order must contain at least one product']
    });
  }

  if (!totalAmount || totalAmount <= 0) {
    console.error('❌ Invalid total amount:', totalAmount);
    return res.status(400).json({
      success: false,
      message: 'Invalid total amount',
      errors: ['Invalid total amount']
    });
  }

  if (!orderAddress) {
    console.error('❌ Shipping address is required');
    return res.status(400).json({
      success: false,
      message: 'Shipping address is required',
      errors: ['Shipping address is required']
    });
  }

  // Build normalized address for Order model
  // Handle both field names: address/street, pincode/zipCode
  const normalizedAddress = {
    street: orderAddress.address || orderAddress.street || '',
    city: orderAddress.city || '',
    state: orderAddress.state || '',
    zipCode: orderAddress.pincode || orderAddress.zipCode || '',
    country: orderAddress.country || 'India'
  };

  console.log('📍 Normalized address:', JSON.stringify(normalizedAddress, null, 2));
  console.log('📍 Street:', normalizedAddress.street, 'Type:', typeof normalizedAddress.street);
  console.log('📍 City:', normalizedAddress.city, 'Type:', typeof normalizedAddress.city);
  console.log('📍 State:', normalizedAddress.state, 'Type:', typeof normalizedAddress.state);
  console.log('📍 ZipCode:', normalizedAddress.zipCode, 'Type:', typeof normalizedAddress.zipCode);

  // Validate required address fields
  if (!normalizedAddress.street || !normalizedAddress.city || !normalizedAddress.state || !normalizedAddress.zipCode) {
    const missingFields = [];
    if (!normalizedAddress.street) missingFields.push('street address');
    if (!normalizedAddress.city) missingFields.push('city');
    if (!normalizedAddress.state) missingFields.push('state');
    if (!normalizedAddress.zipCode) missingFields.push('pincode');
    
    console.error('❌ Address validation failed. Missing fields:', missingFields);
    return res.status(400).json({
      success: false,
      message: 'Complete shipping address is required',
      errors: [`Missing required fields: ${missingFields.join(', ')}`]
    });
  }

  // Build normalized products array for Order model
  const normalizedProducts = [];
  
  // Verify product availability and stock
  for (const item of orderItems) {
    const productId = item.product || item.productId;
    
    // Try to find product in database
    let product = null;
    try {
      product = await Product.findById(productId);
    } catch (err) {
      console.log(`⚠️  Product ${productId} not found in DB, using provided data`);
    }
    
    // If product not found in DB, use the data from order item (for mock products)
    if (!product) {
      normalizedProducts.push({
        productId: productId,
        name: item.name || 'Product',
        quantity: item.quantity,
        price: item.price || 0,
        image: item.image || ''
      });
      continue;
    }

    if (product.stock < item.quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock for ${product.name}`,
        errors: [`Insufficient stock for ${product.name}`]
      });
    }

    // Add to normalized products with all required fields
    normalizedProducts.push({
      productId: product._id,
      name: product.name,
      quantity: item.quantity,
      price: item.price || product.price,
      image: product.image
    });

    // Update product stock
    product.stock -= item.quantity;
    await product.save();
  }

  const order = await Order.create({
    userId: req.user._id,
    products: normalizedProducts,
    totalAmount,
    address: normalizedAddress,
    paymentMethod: paymentMethod || 'card',
    status: 'pending'
  });

  // Clear user's cart after order is placed
  await Cart.findOneAndUpdate(
    { userId: req.user._id },
    { $set: { items: [] } }
  );

  // Populate product details
  await order.populate('products.productId', 'name image');

  res.status(201).json({
    success: true,
    message: 'Order created successfully',
    data: order,
    _id: order._id
  });
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
exports.getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('userId', 'name email')
    .populate('products.productId', 'name image category');

  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }

  // Make sure user can only see their own orders (unless admin)
  if (order.userId._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    const error = new Error('Not authorized to view this order');
    error.statusCode = 403;
    throw error;
  }

  res.status(200).json({
    success: true,
    data: order
  });
});

// @desc    Update order to paid
// @route   PUT /api/orders/:id/pay
// @access  Private
exports.updateOrderToPaid = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }

  order.isPaid = true;
  order.paidAt = Date.now();
  order.paymentResult = {
    id: req.body.id,
    status: req.body.status,
    updateTime: req.body.update_time,
    emailAddress: req.body.payer.email_address
  };

  const updatedOrder = await order.save();

  res.status(200).json({
    success: true,
    data: updatedOrder
  });
});

// @desc    Update order to delivered
// @route   PUT /api/orders/:id/deliver
// @access  Private/Admin
exports.updateOrderToDelivered = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }

  order.isDelivered = true;
  order.deliveredAt = Date.now();
  order.status = 'delivered';

  const updatedOrder = await order.save();

  res.status(200).json({
    success: true,
    data: updatedOrder
  });
});

// @desc    Get logged in user orders
// @route   GET /api/orders/my
// @access  Private
exports.getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ userId: req.user._id })
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: orders.length,
    data: orders
  });
});

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin
exports.getOrders = asyncHandler(async (req, res) => {
  const { status } = req.query;
  
  let query = {};
  if (status) {
    query.status = status;
  }

  const orders = await Order.find(query)
    .populate('userId', 'name email')
    .populate('products.productId', 'name image')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: orders.length,
    data: orders
  });
});

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!status) {
    const error = new Error('Status is required');
    error.statusCode = 400;
    throw error;
  }

  const validStatuses = ['pending', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    const error = new Error('Invalid status');
    error.statusCode = 400;
    throw error;
  }

  const order = await Order.findById(req.params.id);

  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }

  order.status = status;

  // Update delivery status
  if (status === 'delivered') {
    order.isDelivered = true;
    order.deliveredAt = Date.now();
  }

  const updatedOrder = await order.save();

  res.status(200).json({
    success: true,
    message: 'Order status updated successfully',
    data: updatedOrder
  });
});

// @desc    Track order
// @route   GET /api/orders/:id/track
// @access  Private
exports.trackOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .select('status createdAt deliveredAt userId')
    .populate('userId', 'name');

  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }

  // Make sure user can only track their own orders (unless admin)
  if (order.userId._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    const error = new Error('Not authorized to track this order');
    error.statusCode = 403;
    throw error;
  }

  const trackingInfo = {
    orderId: order._id,
    status: order.status,
    createdAt: order.createdAt,
    timeline: [
      {
        status: 'pending',
        date: order.createdAt,
        completed: true
      },
      {
        status: 'shipped',
        completed: order.status === 'shipped' || order.status === 'delivered'
      },
      {
        status: 'delivered',
        date: order.deliveredAt,
        completed: order.status === 'delivered'
      }
    ]
  };

  res.status(200).json({
    success: true,
    data: trackingInfo
  });
});
