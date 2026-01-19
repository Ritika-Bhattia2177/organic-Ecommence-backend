const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  createReview,
  searchProducts
} = require('../controllers/productController');
const { protect, admin } = require('../middleware/authMiddleware');
const { validateRequest, validateProduct } = require('../utils/validation');

// Search route (must come before :id routes)
router.get('/search', searchProducts);

router.route('/')
  .get(getProducts)
  .post(protect, admin, validateRequest(validateProduct), createProduct);

router.route('/:id')
  .get(getProduct)
  .put(protect, admin, validateRequest(validateProduct), updateProduct)
  .delete(protect, admin, deleteProduct);

router.route('/:id/reviews')
  .post(protect, createReview);

module.exports = router;
