const DriverProfile = require('../models/DriverProfile');
const Vehicle = require('../models/Vehicle');

const driverOnly = async (req, res, next) => {
  if (!req.user || req.user.role !== 'driver') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Driver account required',
      error: 'Forbidden'
    });
  }

  try {
    const profile = await DriverProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found. Please complete driver registration.',
        error: 'Profile missing'
      });
    }

    req.driverProfile = profile;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error verifying driver profile',
      error: error.message
    });
  }
};

const approvedDriverOnly = async (req, res, next) => {
  if (!req.user || req.user.role !== 'driver') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Driver role required',
      error: 'Forbidden'
    });
  }

  try {
    const profile = await DriverProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found',
        error: 'Profile missing'
      });
    }

    if (profile.verificationStatus !== 'approved' || profile.applicationStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Driver account is not approved yet. Current status: ' + profile.verificationStatus,
        error: 'Driver not approved'
      });
    }

    // Check active approved vehicle
    const vehicle = await Vehicle.findOne({ driver: profile._id, verificationStatus: 'approved', isActive: true });
    if (!vehicle) {
      return res.status(403).json({
        success: false,
        message: 'No approved and active vehicle found for this driver.',
        error: 'Vehicle not approved'
      });
    }

    req.driverProfile = profile;
    req.vehicle = vehicle;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error verifying driver verification status',
      error: error.message
    });
  }
};

module.exports = { driverOnly, approvedDriverOnly };
