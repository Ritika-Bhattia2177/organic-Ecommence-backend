const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  products: [{
    productId: {
      type: mongoose.Schema.Types.Mixed, // Accept both ObjectId and String for mock products
      required: [true, 'Product ID is required']
    },
    name: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1']
    },
    price: {
      type: Number,
      required: [true, 'Price is required']
    },
    image: {
      type: String
    }
  }],
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  address: {
    street: {
      type: String,
      required: [true, 'Street address is required']
    },
    city: {
      type: String,
      required: [true, 'City is required']
    },
    state: {
      type: String,
      required: [true, 'State is required']
    },
    zipCode: {
      type: String,
      required: [true, 'Zip code is required']
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      default: 'India'
    }
  },
  paymentMethod: {
    type: String,
    required: [true, 'Payment method is required'],
    enum: {
      values: ['card', 'paypal', 'cash', 'upi', 'netbanking', 'cod'],
      message: 'Payment method must be card, paypal, cash, upi, netbanking, or cod'
    }
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'shipped', 'delivered', 'cancelled'],
      message: 'Status must be pending, shipped, delivered, or cancelled'
    },
    default: 'pending'
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  paidAt: {
    type: Date
  },
  isDelivered: {
    type: Boolean,
    default: false
  },
  deliveredAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for faster queries
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1 });

module.exports = mongoose.model('Order', orderSchema);
