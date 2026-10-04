const DriverProfile = require('../models/DriverProfile');
const Vehicle = require('../models/Vehicle');
const Ride = require('../models/Ride');
const { logAudit } = require('../services/auditService');

// @desc    Get driver's own profile and vehicle
// @route   GET /api/drivers/profile
// @access  Private (Driver)
const getDriverProfile = async (req, res, next) => {
  try {
    const profile = await DriverProfile.findOne({ user: req.user._id })
      .populate('user', 'firstName lastName username email phone profileImage accountStatus createdAt');

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found',
        error: 'Profile missing'
      });
    }

    const vehicle = await Vehicle.findOne({ driver: profile._id, isActive: true });

    res.json({
      success: true,
      data: {
        profile,
        vehicle
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update driver profile (address, emergency contact, location)
// @route   PUT /api/drivers/profile
// @access  Private (Driver)
const updateDriverProfile = async (req, res, next) => {
  try {
    const profile = await DriverProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found',
        error: 'Not found'
      });
    }

    if (req.body.address) profile.address = req.body.address.trim();
    if (req.body.emergencyContactName) profile.emergencyContactName = req.body.emergencyContactName.trim();
    if (req.body.emergencyContactPhone) profile.emergencyContactPhone = req.body.emergencyContactPhone.trim();

    if (req.body.latitude && req.body.longitude) {
      profile.lastKnownLocation = {
        latitude: Number(req.body.latitude),
        longitude: Number(req.body.longitude),
        barangay: req.body.barangay || profile.lastKnownLocation?.barangay || 'Centro',
        updatedAt: new Date()
      };
    }

    await profile.save();

    res.json({
      success: true,
      message: 'Driver details updated',
      data: profile
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get driver verification and review status
// @route   GET /api/drivers/verification-status
// @access  Private (Driver)
const getVerificationStatus = async (req, res, next) => {
  try {
    const profile = await DriverProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found',
        error: 'Not found'
      });
    }

    const vehicle = await Vehicle.findOne({ driver: profile._id, isActive: true });

    res.json({
      success: true,
      data: {
        applicationStatus: profile.applicationStatus,
        verificationStatus: profile.verificationStatus,
        rejectionReason: profile.rejectionReason,
        isOnline: profile.isOnline,
        approvedAt: profile.approvedAt,
        documents: profile.documents,
        vehicleStatus: vehicle ? vehicle.verificationStatus : 'no_vehicle'
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload additional driver verification documents
// @route   POST /api/drivers/documents
// @access  Private (Driver)
const uploadDocuments = async (req, res, next) => {
  try {
    const profile = await DriverProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found',
        error: 'Not found'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
        error: 'File required'
      });
    }

    const { docType, title } = req.body;
    if (!docType || !title) {
      return res.status(400).json({
        success: false,
        message: 'Document type and title are required',
        error: 'Validation failed'
      });
    }

    profile.documents.push({
      docType,
      title,
      filePath: `/uploads/driver-documents/${req.file.filename}`,
      uploadedAt: new Date(),
      isVerified: false
    });

    // Reset status to under_review if was rejected
    if (profile.verificationStatus === 'rejected') {
      profile.verificationStatus = 'under_review';
    }

    await profile.save();

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: profile.documents
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Set driver online/offline availability
// @route   PUT /api/drivers/availability
// @access  Private (Driver)
const setAvailability = async (req, res, next) => {
  try {
    const { isOnline } = req.body;

    const profile = await DriverProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found',
        error: 'Not found'
      });
    }

    // Must be approved to go online
    if (isOnline && (profile.verificationStatus !== 'approved' || profile.applicationStatus !== 'approved')) {
      return res.status(403).json({
        success: false,
        message: 'Cannot go online. Driver verification is currently ' + profile.verificationStatus,
        error: 'Not approved'
      });
    }

    // Must have approved vehicle to go online
    if (isOnline) {
      const vehicle = await Vehicle.findOne({ driver: profile._id, verificationStatus: 'approved', isActive: true });
      if (!vehicle) {
        return res.status(403).json({
          success: false,
          message: 'Cannot go online. You do not have an approved and active vehicle.',
          error: 'No approved vehicle'
        });
      }
    }

    profile.isOnline = Boolean(isOnline);
    if (req.body.latitude && req.body.longitude) {
      profile.lastKnownLocation = {
        latitude: Number(req.body.latitude),
        longitude: Number(req.body.longitude),
        barangay: req.body.barangay || profile.lastKnownLocation?.barangay || 'Centro',
        updatedAt: new Date()
      };
    }

    await profile.save();

    res.json({
      success: true,
      message: `Driver is now ${profile.isOnline ? 'ONLINE' : 'OFFLINE'}`,
      data: {
        isOnline: profile.isOnline,
        lastKnownLocation: profile.lastKnownLocation
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get ride requests available for driver to accept
// @route   GET /api/drivers/ride-requests
// @access  Private (Driver)
const getAvailableRideRequests = async (req, res, next) => {
  try {
    const profile = await DriverProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Driver profile not found' });
    }

    if (!profile.isOnline || profile.verificationStatus !== 'approved') {
      return res.json({
        success: true,
        data: [],
        message: 'Driver is offline or unverified'
      });
    }

    const vehicle = await Vehicle.findOne({ driver: profile._id, verificationStatus: 'approved', isActive: true });
    if (!vehicle) {
      return res.json({ success: true, data: [] });
    }

    // Find requested or searching rides matching serviceType, not declined by this driver
    const rides = await Ride.find({
      status: { $in: ['requested', 'searching'] },
      serviceType: vehicle.vehicleType,
      declinedDrivers: { $ne: profile._id }
    })
    .populate('passenger', 'firstName lastName phone')
    .sort({ requestedAt: -1 })
    .limit(10);

    res.json({
      success: true,
      data: rides
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get driver earnings summary
// @route   GET /api/drivers/earnings
// @access  Private (Driver)
const getDriverEarnings = async (req, res, next) => {
  try {
    const profile = await DriverProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Driver profile not found' });
    }

    const { startDate, endDate } = req.query;
    const query = {
      driver: profile._id,
      status: 'completed'
    };

    if (startDate || endDate) {
      query.completedAt = {};
      if (startDate) query.completedAt.$gte = new Date(startDate);
      if (endDate) query.completedAt.$lte = new Date(endDate);
    }

    const completedRides = await Ride.find(query).sort({ completedAt: -1 });

    const totalFares = completedRides.reduce((sum, r) => sum + (r.finalFare || r.estimatedFare || 0), 0);
    const tripsCount = completedRides.length;

    // Today's earnings
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayRides = completedRides.filter(r => new Date(r.completedAt) >= today);
    const todayFares = todayRides.reduce((sum, r) => sum + (r.finalFare || r.estimatedFare || 0), 0);

    res.json({
      success: true,
      data: {
        totalEarnings: totalFares,
        totalTrips: tripsCount,
        todayEarnings: todayFares,
        todayTrips: todayRides.length,
        averageFare: tripsCount > 0 ? Math.round(totalFares / tripsCount) : 0,
        rides: completedRides.slice(0, 20) // Recent 20 trips
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDriverProfile,
  updateDriverProfile,
  getVerificationStatus,
  uploadDocuments,
  setAvailability,
  getAvailableRideRequests,
  getDriverEarnings
};
