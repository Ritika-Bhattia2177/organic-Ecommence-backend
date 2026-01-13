const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUserById,
  updateProfile,
  deleteUser
} = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, admin, getUsers);

router.route('/profile')
  .put(protect, updateProfile);

router.route('/:id')
  .get(protect, admin, getUserById)
  .delete(protect, admin, deleteUser);

module.exports = router;
