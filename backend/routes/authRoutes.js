const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
  registerPassenger,
  registerDriver,
  login,
  getMe,
  changePassword,
  logout
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { uploadProfile, uploadDriverDoc } = require('../middleware/uploadMiddleware');

// Rate limiting for auth endpoints (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many login attempts from this IP. Please try again after 15 minutes.',
    error: 'Rate limit exceeded'
  }
});

// Configure multi-file upload for driver registration
const driverUpload = uploadDriverDoc.fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'licenseDoc', maxCount: 1 },
  { name: 'govIdDoc', maxCount: 1 },
  { name: 'clearanceDoc', maxCount: 1 }
]);

router.post('/register', authLimiter, uploadProfile.single('profileImage'), registerPassenger);
router.post('/register-driver', authLimiter, driverUpload, registerDriver);
router.post('/login', authLimiter, login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);

module.exports = router;
