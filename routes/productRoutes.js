const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  createReview
} = require('../controllers/productController');
const { protect, admin } = require('../middleware/authMiddleware');
const { validateRequest, validateProduct } = require('../utils/validation');

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
