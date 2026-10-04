const express = require('express');
const router = express.Router();
const {
  getDriverProfile,
  updateDriverProfile,
  getVerificationStatus,
  uploadDocuments,
  setAvailability,
  getAvailableRideRequests,
  getDriverEarnings
} = require('../controllers/driverController');
const { protect } = require('../middleware/authMiddleware');
const { driverOnly } = require('../middleware/driverMiddleware');
const { uploadDriverDoc } = require('../middleware/uploadMiddleware');

router.use(protect);
router.use(driverOnly);

router.route('/profile')
  .get(getDriverProfile)
  .put(updateDriverProfile);

router.get('/verification-status', getVerificationStatus);
router.post('/documents', uploadDriverDoc.single('document'), uploadDocuments);
router.put('/availability', setAvailability);
router.get('/ride-requests', getAvailableRideRequests);
router.get('/earnings', getDriverEarnings);

module.exports = router;
