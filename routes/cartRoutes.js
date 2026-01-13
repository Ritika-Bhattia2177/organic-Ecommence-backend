const express = require('express');
const router = express.Router();
const {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  addToGuestCart,
  getGuestCart,
  updateGuestCartItem,
  removeFromGuestCart,
  clearGuestCart
} = require('../controllers/cartController');
const { protect } = require('../middleware/authMiddleware');
const { optionalAuth } = require('../middleware/optionalAuth');

// Guest cart routes (no authentication required)
router.post('/guest/add', addToGuestCart);
router.post('/guest/get', getGuestCart);
router.put('/guest/update', updateGuestCartItem);
router.delete('/guest/remove/:productId', removeFromGuestCart);
router.post('/guest/clear', clearGuestCart);

// Authenticated cart routes - protected for logged-in users
router.post('/add', protect, addToCart);
router.get('/', protect, getCart);
router.put('/update', protect, updateCartItem);
router.delete('/remove/:productId', protect, removeFromCart);
router.delete('/clear', protect, clearCart);

module.exports = router;
