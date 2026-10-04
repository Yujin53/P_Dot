const express = require('express');
const router = express.Router();
const {
  estimateFare,
  createRide,
  getRides,
  getRideById,
  acceptRide,
  updateRideStatus,
  cancelRide,
  getRideSummary
} = require('../controllers/rideController');
const { protect } = require('../middleware/authMiddleware');

// Public or authenticated fare calculation
router.post('/estimate', estimateFare);

// Protected routes
router.use(protect);

router.route('/')
  .post(createRide)
  .get(getRides);

router.get('/:id', getRideById);
router.get('/:id/summary', getRideSummary);
router.put('/:id/accept', acceptRide);
router.put('/:id/status', updateRideStatus);
router.put('/:id/cancel', cancelRide);

module.exports = router;
