const express = require('express');
const router = express.Router();
const {
  getFareRules,
  getFaresEstimate,
  getLocations,
  getServiceAreas
} = require('../controllers/fareController');

router.get('/fare-rules', getFareRules);
router.get('/fares/estimate', getFaresEstimate);
router.get('/locations', getLocations);
router.get('/service-areas', getServiceAreas);

module.exports = router;
