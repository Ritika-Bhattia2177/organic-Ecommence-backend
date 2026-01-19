const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.Mixed, // Can be ObjectId or String for guest users
    required: [true, 'User ID is required']
  },
  isGuest: {
    type: Boolean,
    default: false
  },
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required']
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      default: 1
    }
  }]
}, {
  timestamps: true
});

// Index for faster queries - removed duplicate
cartSchema.index({ userId: 1 }, { unique: false });

module.exports = mongoose.model('Cart', cartSchema);
