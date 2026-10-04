const express = require('express');
const router = express.Router();
const {
  createRating,
  getMyRatings,
  getDriverRatings
} = require('../controllers/ratingController');
const { protect } = require('../middleware/authMiddleware');

router.get('/driver/:driverId', getDriverRatings);

router.use(protect);
router.post('/', createRating);
router.get('/my', getMyRatings);

module.exports = router;
