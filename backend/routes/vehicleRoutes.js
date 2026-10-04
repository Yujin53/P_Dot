const express = require('express');
const router = express.Router();
const {
  getMyVehicles,
  addVehicle,
  updateVehicle,
  deleteVehicle
} = require('../controllers/vehicleController');
const { protect } = require('../middleware/authMiddleware');
const { driverOnly } = require('../middleware/driverMiddleware');
const { uploadVehicle } = require('../middleware/uploadMiddleware');

router.use(protect);
router.use(driverOnly);

router.route('/my').get(getMyVehicles);
router.route('/')
  .post(uploadVehicle.array('photos', 5), addVehicle);
router.route('/:id')
  .put(uploadVehicle.array('photos', 5), updateVehicle)
  .delete(deleteVehicle);

module.exports = router;
