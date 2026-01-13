const asyncHandler = require('express-async-handler');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

// @desc    Add item to cart
// @route   POST /api/cart/add
// @access  Private
exports.addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;

  if (!productId) {
    const error = new Error('Product ID is required');
    error.statusCode = 400;
    throw error;
  }

  // Check if product exists
  const product = await Product.findById(productId);
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  // Check if product is in stock
  if (product.stock < (quantity || 1)) {
    const error = new Error('Insufficient stock');
    error.statusCode = 400;
    throw error;
  }

  // Find or create cart for user
  let cart = await Cart.findOne({ userId: req.user._id });

  if (!cart) {
    // Create new cart
    cart = await Cart.create({
      userId: req.user._id,
      items: [{ productId, quantity: quantity || 1 }]
    });
  } else {
    // Check if product already exists in cart
    const itemIndex = cart.items.findIndex(
      item => item.productId.toString() === productId
    );

    if (itemIndex > -1) {
      // Update quantity
      const newQuantity = cart.items[itemIndex].quantity + (quantity || 1);
      
      // Check stock availability
      if (product.stock < newQuantity) {
        const error = new Error('Insufficient stock');
        error.statusCode = 400;
        throw error;
      }
      
      cart.items[itemIndex].quantity = newQuantity;
    } else {
      // Add new item to cart
      cart.items.push({ productId, quantity: quantity || 1 });
    }

    await cart.save();
  }

  // Populate cart with product details
  await cart.populate('items.productId', 'name price image stock');

  res.status(200).json({
    success: true,
    data: cart
  });
});

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
exports.getCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ userId: req.user._id })
    .populate('items.productId', 'name price image stock category');

  if (!cart) {
    return res.status(200).json({
      success: true,
      data: { userId: req.user._id, items: [] }
    });
  }

  res.status(200).json({
    success: true,
    data: cart
  });
});

// @desc    Update cart item quantity
// @route   PUT /api/cart/update
// @access  Private
exports.updateCartItem = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;

  if (!productId || !quantity) {
    const error = new Error('Product ID and quantity are required');
    error.statusCode = 400;
    throw error;
  }

  if (quantity < 1) {
    const error = new Error('Quantity must be at least 1');
    error.statusCode = 400;
    throw error;
  }

  // Check if product exists and has enough stock
  const product = await Product.findById(productId);
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  if (product.stock < quantity) {
    const error = new Error('Insufficient stock');
    error.statusCode = 400;
    throw error;
  }

  const cart = await Cart.findOne({ userId: req.user._id });

  if (!cart) {
    const error = new Error('Cart not found');
    error.statusCode = 404;
    throw error;
  }

  // Find item in cart
  const itemIndex = cart.items.findIndex(
    item => item.productId.toString() === productId
  );

  if (itemIndex === -1) {
    const error = new Error('Product not found in cart');
    error.statusCode = 404;
    throw error;
  }

  // Update quantity
  cart.items[itemIndex].quantity = quantity;
  await cart.save();

  // Populate cart with product details
  await cart.populate('items.productId', 'name price image stock');

  res.status(200).json({
    success: true,
    data: cart
  });
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/remove/:productId
// @access  Private
exports.removeFromCart = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  if (!productId) {
    const error = new Error('Product ID is required');
    error.statusCode = 400;
    throw error;
  }

  const cart = await Cart.findOne({ userId: req.user._id });

  if (!cart) {
    const error = new Error('Cart not found');
    error.statusCode = 404;
    throw error;
  }

  // Remove item from cart
  cart.items = cart.items.filter(
    item => item.productId.toString() !== productId
  );

  await cart.save();

  // Populate cart with product details
  await cart.populate('items.productId', 'name price image stock');

  res.status(200).json({
    success: true,
    data: cart
  });
});

// @desc    Clear cart
// @route   DELETE /api/cart/clear
// @access  Private
exports.clearCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ userId: req.user._id });

  if (!cart) {
    return res.status(200).json({
      success: true,
      message: 'Cart is already empty'
    });
  }

  cart.items = [];
  await cart.save();

  res.status(200).json({
    success: true,
    message: 'Cart cleared successfully',
    data: cart
  });
});

// @desc    Add item to guest cart (stored in MongoDB with session ID)
// @route   POST /api/cart/guest/add
// @access  Public
exports.addToGuestCart = asyncHandler(async (req, res) => {
  const { productId, quantity, sessionId } = req.body;

  if (!productId || !sessionId) {
    const error = new Error('Product ID and session ID are required');
    error.statusCode = 400;
    throw error;
  }

  // Check if product exists
  const product = await Product.findById(productId);
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  // Find or create guest cart using sessionId as userId
  let cart = await Cart.findOne({ userId: sessionId });

  if (!cart) {
    // Create new cart for guest
    cart = await Cart.create({
      userId: sessionId,
      items: [{ productId, quantity: quantity || 1 }],
      isGuest: true
    });
  } else {
    // Check if product already exists in cart
    const itemIndex = cart.items.findIndex(
      item => item.productId.toString() === productId
    );

    if (itemIndex > -1) {
      // Update quantity
      cart.items[itemIndex].quantity += (quantity || 1);
    } else {
      // Add new item to cart
      cart.items.push({ productId, quantity: quantity || 1 });
    }

    await cart.save();
  }

  // Populate cart with product details
  await cart.populate('items.productId', 'name price image stock category');

  res.status(200).json({
    success: true,
    data: cart,
    message: 'Item added to cart successfully'
  });
});

// @desc    Get guest cart
// @route   POST /api/cart/guest/get
// @access  Public
exports.getGuestCart = asyncHandler(async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(200).json({
      success: true,
      data: { userId: sessionId, items: [] }
    });
  }

  const cart = await Cart.findOne({ userId: sessionId })
    .populate('items.productId', 'name price image stock category');

  if (!cart) {
    return res.status(200).json({
      success: true,
      data: { userId: sessionId, items: [] }
    });
  }

  res.status(200).json({
    success: true,
    data: cart
  });
});

// @desc    Update guest cart item quantity
// @route   PUT /api/cart/guest/update
// @access  Public
exports.updateGuestCartItem = asyncHandler(async (req, res) => {
  const { productId, quantity, sessionId } = req.body;

  if (!productId || !quantity || !sessionId) {
    const error = new Error('Product ID, quantity, and session ID are required');
    error.statusCode = 400;
    throw error;
  }

  if (quantity < 1) {
    const error = new Error('Quantity must be at least 1');
    error.statusCode = 400;
    throw error;
  }

  // Check if product exists and has enough stock
  const product = await Product.findById(productId);
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  if (product.stock < quantity) {
    const error = new Error('Insufficient stock');
    error.statusCode = 400;
    throw error;
  }

  const cart = await Cart.findOne({ userId: sessionId });

  if (!cart) {
    const error = new Error('Cart not found');
    error.statusCode = 404;
    throw error;
  }

  // Find item in cart
  const itemIndex = cart.items.findIndex(
    item => item.productId.toString() === productId
  );

  if (itemIndex === -1) {
    const error = new Error('Product not found in cart');
    error.statusCode = 404;
    throw error;
  }

  // Update quantity
  cart.items[itemIndex].quantity = quantity;
  await cart.save();

  // Populate cart with product details
  await cart.populate('items.productId', 'name price image stock category');

  res.status(200).json({
    success: true,
    data: cart,
    message: 'Cart updated successfully'
  });
});

// @desc    Remove item from guest cart
// @route   DELETE /api/cart/guest/remove/:productId
// @access  Public
exports.removeFromGuestCart = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { sessionId } = req.body;

  if (!sessionId) {
    const error = new Error('Session ID is required');
    error.statusCode = 400;
    throw error;
  }

  const cart = await Cart.findOne({ userId: sessionId });

  if (!cart) {
    const error = new Error('Cart not found');
    error.statusCode = 404;
    throw error;
  }

  // Remove item from cart
  cart.items = cart.items.filter(
    item => item.productId.toString() !== productId
  );

  await cart.save();

  // Populate cart with product details
  await cart.populate('items.productId', 'name price image stock category');

  res.status(200).json({
    success: true,
    data: cart,
    message: 'Item removed from cart'
  });
});

// @desc    Clear guest cart
// @route   POST /api/cart/guest/clear
// @access  Public
exports.clearGuestCart = asyncHandler(async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(200).json({
      success: true,
      message: 'No session ID provided'
    });
  }

  const cart = await Cart.findOne({ userId: sessionId });

  if (!cart) {
    return res.status(200).json({
      success: true,
      message: 'Cart is already empty'
    });
  }

  cart.items = [];
  await cart.save();

  res.status(200).json({
    success: true,
    message: 'Guest cart cleared successfully',
    data: cart
  });
});
