const express = require('express');
const router = express.Router();
const { updateLocation, getLatestLocationByOrder } = require('../controllers/locationController');
const { protect } = require('../middleware/authMiddleware');

router.post('/update', updateLocation);
router.get('/:orderId/latest', protect, getLatestLocationByOrder);

module.exports = router;