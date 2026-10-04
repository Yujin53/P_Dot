const Vehicle = require('../models/Vehicle');
const DriverProfile = require('../models/DriverProfile');
const { logAudit } = require('../services/auditService');

// @desc    Get current driver's vehicle(s)
// @route   GET /api/vehicles/my
// @access  Private (Driver)
const getMyVehicles = async (req, res, next) => {
  try {
    const profile = await DriverProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Driver profile not found' });
    }

    const vehicles = await Vehicle.find({ driver: profile._id });
    res.json({
      success: true,
      data: vehicles
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add or register a new vehicle
// @route   POST /api/vehicles
// @access  Private (Driver)
const addVehicle = async (req, res, next) => {
  try {
    const profile = await DriverProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Driver profile not found' });
    }

    const { vehicleType, make, model, year, color, plateNumber, registrationReference, capacity } = req.body;

    if (!vehicleType || !make || !model || !year || !plateNumber) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle type, make, model, year, and plate number are required',
        error: 'Validation failed'
      });
    }

    const existingPlate = await Vehicle.findOne({ plateNumber: plateNumber.toUpperCase() });
    if (existingPlate) {
      return res.status(409).json({
        success: false,
        message: 'Plate number is already registered in the system',
        error: 'Duplicate plate'
      });
    }

    let photos = [];
    if (req.files && req.files.length > 0) {
      photos = req.files.map(f => `/uploads/vehicles/${f.filename}`);
    }

    const vehicle = await Vehicle.create({
      driver: profile._id,
      vehicleType,
      make,
      model,
      year: Number(year),
      color: color || 'Standard',
      plateNumber: plateNumber.toUpperCase(),
      registrationReference: registrationReference || 'ORCR-PENDING',
      capacity: Number(capacity) || (vehicleType === 'motorcycle' ? 1 : vehicleType === 'sedan' ? 4 : 3),
      photos,
      verificationStatus: 'pending',
      isActive: true
    });

    await logAudit({
      actor: req.user._id,
      action: 'VEHICLE_ADDED',
      targetType: 'Vehicle',
      targetId: vehicle._id,
      description: `Driver registered vehicle ${plateNumber}`,
      req
    });

    res.status(201).json({
      success: true,
      message: 'Vehicle registered. Pending administrator review.',
      data: vehicle
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update vehicle details
// @route   PUT /api/vehicles/:id
// @access  Private (Driver)
const updateVehicle = async (req, res, next) => {
  try {
    const profile = await DriverProfile.findOne({ user: req.user._id });
    const vehicle = await Vehicle.findOne({ _id: req.params.id, driver: profile._id });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found or unauthorized',
        error: 'Not found'
      });
    }

    if (req.body.color) vehicle.color = req.body.color.trim();
    if (req.body.capacity) vehicle.capacity = Number(req.body.capacity);
    if (req.body.isActive !== undefined) vehicle.isActive = Boolean(req.body.isActive);

    if (req.files && req.files.length > 0) {
      const newPhotos = req.files.map(f => `/uploads/vehicles/${f.filename}`);
      vehicle.photos = [...vehicle.photos, ...newPhotos];
    }

    await vehicle.save();

    res.json({
      success: true,
      message: 'Vehicle updated',
      data: vehicle
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete/Deactivate vehicle
// @route   DELETE /api/vehicles/:id
// @access  Private (Driver)
const deleteVehicle = async (req, res, next) => {
  try {
    const profile = await DriverProfile.findOne({ user: req.user._id });
    const vehicle = await Vehicle.findOne({ _id: req.params.id, driver: profile._id });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found or unauthorized'
      });
    }

    vehicle.isActive = false;
    await vehicle.save();

    res.json({
      success: true,
      message: 'Vehicle deactivated'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyVehicles,
  addVehicle,
  updateVehicle,
  deleteVehicle
};
