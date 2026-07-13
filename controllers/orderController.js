const asyncHandler = require('express-async-handler');
const PDFDocument = require('pdfkit');
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

// @desc    Generate PDF invoice for order
// @route   GET /api/orders/:id/invoice
// @access  Private
exports.generateInvoice = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('userId', 'name email');

  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  // Make sure user can only access their own invoice (unless admin)
  if (order.userId._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not authorized to access this invoice' });
  }

  try {
    // Create PDF document
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Set response headers BEFORE piping
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${order._id.toString().slice(-8)}.pdf`);

    // Handle stream errors to prevent server crash
    doc.on('error', (err) => {
      console.error('PDF generation error:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Failed to generate invoice PDF' });
      }
    });

    // Pipe the PDF document directly to the response
    doc.pipe(res);

    // --- Invoice Design ---

    // Colors
    const primaryColor = '#16a34a';   // Green-600
    const darkColor    = '#1f2937';   // Gray-800
    const lightColor   = '#f9fafb';   // Gray-50
    const borderColor  = '#e5e7eb';   // Gray-200
    const accentColor  = '#4b5563';   // Gray-600

    // 1. Header
    doc.fillColor(primaryColor)
       .fontSize(24)
       .font('Helvetica-Bold')
       .text('OrganicMart', 50, 50);

    doc.fillColor(accentColor)
       .fontSize(10)
       .font('Helvetica')
       .text('Pure. Fresh. Sustainable.', 50, 80);

    doc.fillColor(darkColor)
       .fontSize(20)
       .font('Helvetica-Bold')
       .text('INVOICE', 400, 50, { align: 'right' });

    doc.fillColor(accentColor)
       .fontSize(10)
       .font('Helvetica')
       .text(`Invoice #: INV-${order._id.toString().slice(-8).toUpperCase()}`, 400, 80, { align: 'right' })
       .text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 400, 95, { align: 'right' });

    // Divider line (use lineWidth, NOT strokeWidth)
    doc.moveTo(50, 120)
       .lineTo(550, 120)
       .strokeColor(borderColor)
       .lineWidth(1)
       .stroke();

    // 2. Billed To & Payment Info
    const gridY = 140;

    doc.fillColor(darkColor)
       .fontSize(12)
       .font('Helvetica-Bold')
       .text('Billed To:', 50, gridY);

    doc.fillColor(accentColor)
       .fontSize(10)
       .font('Helvetica')
       .text(order.userId.name || 'Customer', 50, gridY + 18)
       .text(order.userId.email || '', 50, gridY + 33);

    const shippingAddressStr = order.address
      ? `${order.address.street || ''}, ${order.address.city || ''}, ${order.address.state || ''} - ${order.address.zipCode || ''}, ${order.address.country || 'India'}`
      : 'N/A';

    doc.text(shippingAddressStr, 50, gridY + 48, { width: 220 });

    doc.fillColor(darkColor)
       .fontSize(12)
       .font('Helvetica-Bold')
       .text('Payment Info:', 320, gridY);

    doc.fillColor(accentColor)
       .fontSize(10)
       .font('Helvetica')
       .text(`Method: ${order.paymentMethod ? order.paymentMethod.toUpperCase() : 'N/A'}`, 320, gridY + 18)
       .text(`Status: ${order.isPaid ? 'PAID ✓' : 'PENDING'}`, 320, gridY + 33)
       .text(`Order Status: ${(order.status || 'pending').toUpperCase()}`, 320, gridY + 48);

    if (order.isPaid && order.paidAt) {
      doc.text(`Paid At: ${new Date(order.paidAt).toLocaleDateString()}`, 320, gridY + 63);
    }

    // Divider
    doc.moveTo(50, 220)
       .lineTo(550, 220)
       .strokeColor(borderColor)
       .lineWidth(1)
       .stroke();

    // 3. Table Headers
    const tableY = 240;
    doc.fillColor(darkColor)
       .fontSize(10)
       .font('Helvetica-Bold');

    doc.text('Item Description', 50, tableY);
    doc.text('Price', 280, tableY, { width: 70, align: 'right' });
    doc.text('Qty',   360, tableY, { width: 50, align: 'right' });
    doc.text('Total', 420, tableY, { width: 80, align: 'right' });

    doc.moveTo(50, tableY + 15)
       .lineTo(550, tableY + 15)
       .strokeColor(darkColor)
       .lineWidth(1)
       .stroke();

    // 4. Table Items
    let currentY = tableY + 25;
    doc.font('Helvetica').fontSize(10).fillColor(accentColor);

    order.products.forEach((item) => {
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
        // Repeat headers on new page
        doc.fillColor(darkColor).fontSize(10).font('Helvetica-Bold');
        doc.text('Item Description', 50, currentY);
        doc.text('Price', 280, currentY, { width: 70, align: 'right' });
        doc.text('Qty',   360, currentY, { width: 50, align: 'right' });
        doc.text('Total', 420, currentY, { width: 80, align: 'right' });
        doc.moveTo(50, currentY + 15).lineTo(550, currentY + 15)
           .strokeColor(darkColor).lineWidth(1).stroke();
        currentY += 25;
        doc.font('Helvetica').fontSize(10).fillColor(accentColor);
      }

      const itemTotal = (item.price || 0) * (item.quantity || 0);
      doc.text(item.name || 'Product', 50, currentY, { width: 220 });
      doc.text(`$${(item.price || 0).toFixed(2)}`, 280, currentY, { width: 70, align: 'right' });
      doc.text((item.quantity || 1).toString(), 360, currentY, { width: 50, align: 'right' });
      doc.text(`$${itemTotal.toFixed(2)}`, 420, currentY, { width: 80, align: 'right' });

      doc.moveTo(50, currentY + 18)
         .lineTo(550, currentY + 18)
         .strokeColor(borderColor)
         .lineWidth(0.5)
         .stroke();

      currentY += 25;
    });

    // 5. Totals box
    currentY += 15;
    if (currentY > 680) {
      doc.addPage();
      currentY = 50;
    }

    doc.rect(320, currentY, 230, 75)
       .fillColor(lightColor)
       .fill();

    doc.strokeColor(borderColor)
       .lineWidth(1)
       .rect(320, currentY, 230, 75)
       .stroke();

    doc.fillColor(darkColor)
       .fontSize(11)
       .font('Helvetica-Bold')
       .text('Order Summary', 340, currentY + 10);

    doc.font('Helvetica').fontSize(10).fillColor(accentColor);
    doc.text('Subtotal:', 340, currentY + 30);
    doc.text(`$${(order.totalAmount || 0).toFixed(2)}`, 430, currentY + 30, { width: 100, align: 'right' });

    doc.fillColor(primaryColor)
       .font('Helvetica-Bold')
       .fontSize(12)
       .text('Grand Total:', 340, currentY + 50);
    doc.text(`$${(order.totalAmount || 0).toFixed(2)}`, 430, currentY + 50, { width: 100, align: 'right' });

    // 6. Footer
    const footerY = 760;
    doc.moveTo(50, footerY - 10)
       .lineTo(550, footerY - 10)
       .strokeColor(borderColor)
       .lineWidth(0.5)
       .stroke();

    doc.fillColor(accentColor)
       .fontSize(9)
       .font('Helvetica-Oblique')
       .text('Thank you for supporting organic farmers! 🌿', 50, footerY, { align: 'center', width: 500 });

    doc.font('Helvetica')
       .fontSize(8)
       .fillColor(accentColor)
       .text('Questions? Contact us at support@organicmart.com', 50, footerY + 14, { align: 'center', width: 500 });

    // Finalize PDF
    doc.end();

  } catch (err) {
    console.error('❌ Invoice generation error:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to generate invoice PDF' });
    }
  }
});

