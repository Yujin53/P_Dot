const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  updateUserProfile,
  getSavedPlaces,
  addSavedPlace,
  updateSavedPlace,
  deleteSavedPlace
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { uploadProfile } = require('../middleware/uploadMiddleware');

router.use(protect);

router.route('/profile')
  .get(getUserProfile)
  .put(uploadProfile.single('profileImage'), updateUserProfile);

router.route('/saved-places')
  .get(getSavedPlaces)
  .post(addSavedPlace);

router.route('/saved-places/:id')
  .put(updateSavedPlace)
  .delete(deleteSavedPlace);

module.exports = router;
