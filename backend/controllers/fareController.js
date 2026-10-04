const FareRule = require('../models/FareRule');
const Location = require('../models/Location');
const { calculateFare, calculateHaversineDistanceKm } = require('../services/fareService');

// @desc    Get all active fare rules
// @route   GET /api/fare-rules
// @access  Public
const getFareRules = async (req, res, next) => {
  try {
    const rules = await FareRule.find({ isActive: true });
    res.json({
      success: true,
      data: rules
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get fare estimate endpoint
// @route   GET /api/fares/estimate
// @access  Public
const getFaresEstimate = async (req, res, next) => {
  try {
    const { serviceType = 'tricycle', distanceKm = 2, durationMin = 8 } = req.query;

    const estimate = await calculateFare({
      serviceType,
      distanceKm: Number(distanceKm),
      durationMinutes: Number(durationMin)
    });

    res.json({
      success: true,
      data: estimate
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Tuguegarao landmarks and locations
// @route   GET /api/locations
// @access  Public
const getLocations = async (req, res, next) => {
  try {
    const { search, type, barangay } = req.query;
    const query = { isActive: true };

    if (type) query.type = type;
    if (barangay) query.barangay = new RegExp(barangay, 'i');
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { address: new RegExp(search, 'i') },
        { aliases: new RegExp(search, 'i') }
      ];
    }

    const locations = await Location.find(query).sort({ name: 1 });

    res.json({
      success: true,
      data: locations
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get active service areas
// @route   GET /api/service-areas
// @access  Public
const getServiceAreas = async (req, res, next) => {
  try {
    const areas = await Location.find({ isServiceArea: true, isActive: true }).sort({ barangay: 1 });
    res.json({
      success: true,
      data: areas
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFareRules,
  getFaresEstimate,
  getLocations,
  getServiceAreas
};
