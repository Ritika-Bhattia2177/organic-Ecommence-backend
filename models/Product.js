const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a product name'],
    trim: true,
    maxlength: [100, 'Product name cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide a product description'],
    maxlength: [2000, 'Description cannot be more than 2000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Please provide a product price'],
    min: [0, 'Price cannot be negative']
  },
  comparePrice: {
    type: Number,
    min: [0, 'Compare price cannot be negative']
  },
  category: {
    type: String,
    required: [true, 'Please provide a product category'],
    enum: ['Dairy', 'Organic Medicines', 'Farm Products', 'Fruits', 'Vegetables']
  },
  image: {
    type: String,
    required: [true, 'Please provide a product image']
  },
  images: [{
    type: String
  }],
  rating: {
    type: Number,
    default: 0,
    min: [0, 'Rating must be at least 0'],
    max: [5, 'Rating cannot be more than 5']
  },
  numReviews: {
    type: Number,
    default: 0
  },
  inStock: {
    type: Boolean,
    default: true
  },
  stock: {
    type: Number,
    default: 0,
    min: [0, 'Stock cannot be negative']
  },
  unit: {
    type: String,
    default: 'piece'
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isOrganic: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String
  }],
  benefits: {
    type: String,
    maxlength: [1000, 'Benefits cannot be more than 1000 characters']
  },
  nutrition: {
    type: String,
    maxlength: [1000, 'Nutrition information cannot be more than 1000 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Create index for search
productSchema.index({ name: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Product', productSchema);
