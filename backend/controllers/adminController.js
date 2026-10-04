const User = require('../models/User');
const DriverProfile = require('../models/DriverProfile');
const Vehicle = require('../models/Vehicle');
const Ride = require('../models/Ride');
const FareRule = require('../models/FareRule');
const Location = require('../models/Location');
const SupportTicket = require('../models/SupportTicket');
const Rating = require('../models/Rating');
const AuditLog = require('../models/AuditLog');
const { logAudit } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');

// @desc    Admin Dashboard Metrics & Statistics
// @route   GET /api/admin/dashboard
// @access  Private (Admin)
const getAdminDashboard = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalPassengers = await User.countDocuments({ role: 'passenger' });
    const totalDrivers = await User.countDocuments({ role: 'driver' });
    const pendingDriverApps = await DriverProfile.countDocuments({ applicationStatus: { $in: ['pending', 'under_review'] } });
    const approvedDrivers = await DriverProfile.countDocuments({ verificationStatus: 'approved' });
    const onlineDrivers = await DriverProfile.countDocuments({ isOnline: true, verificationStatus: 'approved' });

    // Rides today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const ridesToday = await Ride.countDocuments({ requestedAt: { $gte: startOfToday } });
    const activeRides = await Ride.countDocuments({
      status: { $in: ['requested', 'searching', 'accepted', 'driver_arriving', 'driver_arrived', 'trip_started'] }
    });
    const completedRides = await Ride.countDocuments({ status: 'completed' });
    const cancelledRides = await Ride.countDocuments({
      status: { $in: ['cancelled_by_passenger', 'cancelled_by_driver', 'cancelled_by_admin'] }
    });
    const noDriverRides = await Ride.countDocuments({ status: 'no_driver_available' });

    // Financials
    const completedTrips = await Ride.find({ status: 'completed' }).select('finalFare estimatedFare');
    const totalRecordedFares = completedTrips.reduce((acc, r) => acc + (r.finalFare || r.estimatedFare || 0), 0);

    // Support & Ratings
    const openTickets = await SupportTicket.countDocuments({ status: { $in: ['open', 'in_review'] } });
    const ratings = await Rating.find().select('rating');
    const avgRating = ratings.length > 0
      ? (ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length).toFixed(1)
      : 5.0;

    // Recent 5 rides
    const recentRides = await Ride.find()
      .populate('passenger', 'firstName lastName phone')
      .populate({
        path: 'driver',
        populate: { path: 'user', select: 'firstName lastName phone' }
      })
      .sort({ requestedAt: -1 })
      .limit(5);

    // Recent 5 audit logs
    const recentAudits = await AuditLog.find()
      .populate('actor', 'firstName lastName username email role')
      .sort({ timestamp: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalPassengers,
        totalDrivers,
        pendingDriverApps,
        approvedDrivers,
        onlineDrivers,
        ridesToday,
        activeRides,
        completedRides,
        cancelledRides,
        noDriverRides,
        totalRecordedFares,
        openTickets,
        averageRating: Number(avgRating),
        recentRides,
        recentAudits
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: Get all users with pagination and search
// @route   GET /api/admin/users
// @access  Private (Admin)
const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.role) query.role = req.query.role;
    if (req.query.accountStatus) query.accountStatus = req.query.accountStatus;
    if (req.query.search) {
      const s = req.query.search.trim();
      query.$or = [
        { firstName: new RegExp(s, 'i') },
        { lastName: new RegExp(s, 'i') },
        { email: new RegExp(s, 'i') },
        { username: new RegExp(s, 'i') },
        { phone: new RegExp(s, 'i') }
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: Update user account status
// @route   PUT /api/admin/users/:id/status
// @access  Private (Admin)
const updateUserStatus = async (req, res, next) => {
  try {
    const { status, role } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Protection rule: Do not disable or delete the last active superadmin
    if (user.role === 'superadmin' && status && status !== 'active') {
      const activeSuperadmins = await User.countDocuments({ role: 'superadmin', accountStatus: 'active' });
      if (activeSuperadmins <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot disable or suspend the final active superadmin account.',
          error: 'Protection violation'
        });
      }
    }

    // Only superadmin can create/modify superadmin role
    if (role === 'superadmin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Only superadmin can promote a user to superadmin',
        error: 'Forbidden'
      });
    }

    if (status) user.accountStatus = status;
    if (role) user.role = role;

    await user.save();

    await logAudit({
      actor: req.user._id,
      action: 'USER_STATUS_UPDATED',
      targetType: 'User',
      targetId: user._id,
      description: `Admin updated user ${user.username} (status: ${status || user.accountStatus}, role: ${role || user.role})`,
      req
    });

    res.json({
      success: true,
      message: 'User account status updated',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: Get all drivers with application/verification status
// @route   GET /api/admin/drivers
// @access  Private (Admin)
const getAllDrivers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.verificationStatus) query.verificationStatus = req.query.verificationStatus;
    if (req.query.isOnline !== undefined) query.isOnline = req.query.isOnline === 'true';

    const total = await DriverProfile.countDocuments(query);
    const drivers = await DriverProfile.find(query)
      .populate('user', 'firstName lastName username email phone profileImage accountStatus createdAt')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Attach vehicles
    const driverIds = drivers.map(d => d._id);
    const vehicles = await Vehicle.find({ driver: { $in: driverIds } });
    const vehicleMap = {};
    vehicles.forEach(v => { vehicleMap[v.driver.toString()] = v; });

    const driverListWithVehicle = drivers.map(d => ({
      ...d.toObject(),
      vehicle: vehicleMap[d._id.toString()] || null
    }));

    res.json({
      success: true,
      data: driverListWithVehicle,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: Approve driver application
// @route   PUT /api/admin/drivers/:id/approve
// @access  Private (Admin)
const approveDriver = async (req, res, next) => {
  try {
    const driver = await DriverProfile.findById(req.params.id).populate('user');
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver profile not found' });
    }

    driver.applicationStatus = 'approved';
    driver.verificationStatus = 'approved';
    driver.approvedBy = req.user._id;
    driver.approvedAt = new Date();
    driver.rejectionReason = undefined;

    // Mark documents verified
    driver.documents.forEach(doc => { doc.isVerified = true; });

    await driver.save();

    // Auto-approve associated vehicle if pending
    await Vehicle.updateMany(
      { driver: driver._id, verificationStatus: 'pending' },
      { verificationStatus: 'approved' }
    );

    await logAudit({
      actor: req.user._id,
      action: 'APPROVE_DRIVER',
      targetType: 'DriverProfile',
      targetId: driver._id,
      description: `Admin approved driver ${driver.user.firstName} ${driver.user.lastName}`,
      req
    });

    await createNotification({
      recipient: driver.user._id,
      title: 'Congratulations! Your Driver Application is Approved',
      message: 'Your documents and vehicle have been verified. You can now toggle Online and start accepting ride requests in Tuguegarao!',
      type: 'driver_application'
    });

    res.json({
      success: true,
      message: 'Driver application approved successfully',
      data: driver
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: Reject driver application
// @route   PUT /api/admin/drivers/:id/reject
// @access  Private (Admin)
const rejectDriver = async (req, res, next) => {
  try {
    const { rejectionReason } = req.body;
    const driver = await DriverProfile.findById(req.params.id).populate('user');
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver profile not found' });
    }

    driver.applicationStatus = 'rejected';
    driver.verificationStatus = 'rejected';
    driver.isOnline = false;
    driver.rejectionReason = rejectionReason || 'Application documents did not meet verification criteria.';

    await driver.save();

    await logAudit({
      actor: req.user._id,
      action: 'REJECT_DRIVER',
      targetType: 'DriverProfile',
      targetId: driver._id,
      description: `Admin rejected driver ${driver.user.firstName} ${driver.user.lastName}: ${driver.rejectionReason}`,
      req
    });

    await createNotification({
      recipient: driver.user._id,
      title: 'Driver Application Update',
      message: `Your driver application was rejected. Reason: ${driver.rejectionReason}. You may re-upload documents in your profile.`,
      type: 'driver_application'
    });

    res.json({
      success: true,
      message: 'Driver application rejected',
      data: driver
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: Suspend or Reactivate driver
// @route   PUT /api/admin/drivers/:id/suspend
// @access  Private (Admin)
const toggleSuspendDriver = async (req, res, next) => {
  try {
    const { action, reason } = req.body; // action: 'suspend' or 'reactivate'
    const driver = await DriverProfile.findById(req.params.id).populate('user');

    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver profile not found' });
    }

    if (action === 'suspend') {
      driver.verificationStatus = 'suspended';
      driver.isOnline = false;
      driver.rejectionReason = reason || 'Account temporarily suspended by administration';
      await driver.save();

      await logAudit({
        actor: req.user._id,
        action: 'SUSPEND_DRIVER',
        targetType: 'DriverProfile',
        targetId: driver._id,
        description: `Admin suspended driver ${driver.user.firstName} ${driver.user.lastName}`,
        req
      });

      await createNotification({
        recipient: driver.user._id,
        title: 'Driver Account Suspended',
        message: `Your driving privileges have been suspended. Reason: ${driver.rejectionReason}`,
        type: 'driver_application'
      });
    } else {
      driver.verificationStatus = 'approved';
      driver.rejectionReason = undefined;
      await driver.save();

      await logAudit({
        actor: req.user._id,
        action: 'REACTIVATE_DRIVER',
        targetType: 'DriverProfile',
        targetId: driver._id,
        description: `Admin reactivated driver ${driver.user.firstName} ${driver.user.lastName}`,
        req
      });

      await createNotification({
        recipient: driver.user._id,
        title: 'Driver Account Reactivated',
        message: 'Your driving privileges have been restored. You can go online again.',
        type: 'driver_application'
      });
    }

    res.json({
      success: true,
      message: `Driver ${action === 'suspend' ? 'suspended' : 'reactivated'} successfully`,
      data: driver
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: Get all vehicles
// @route   GET /api/admin/vehicles
// @access  Private (Admin)
const getAllVehicles = async (req, res, next) => {
  try {
    const query = {};
    if (req.query.verificationStatus) query.verificationStatus = req.query.verificationStatus;
    if (req.query.vehicleType) query.vehicleType = req.query.vehicleType;

    const vehicles = await Vehicle.find(query)
      .populate({
        path: 'driver',
        populate: { path: 'user', select: 'firstName lastName phone email' }
      })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: vehicles
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: Cancel ride administratively
// @route   PUT /api/admin/rides/:id/cancel
// @access  Private (Admin)
const adminCancelRide = async (req, res, next) => {
  try {
    const { cancellationReason } = req.body;
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    if (ride.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Cannot cancel a completed ride' });
    }

    ride.status = 'cancelled_by_admin';
    ride.cancelledAt = new Date();
    ride.cancelledBy = req.user._id;
    ride.cancellationReason = cancellationReason || 'Cancelled by administrator due to operational necessity';

    await ride.save();

    await logAudit({
      actor: req.user._id,
      action: 'ADMIN_CANCEL_RIDE',
      targetType: 'Ride',
      targetId: ride._id,
      description: `Admin cancelled ride #${ride._id}: ${ride.cancellationReason}`,
      req
    });

    // Notify passenger
    await createNotification({
      recipient: ride.passenger,
      title: 'Ride Cancelled by Admin',
      message: `Your booking was cancelled by P_Dot Admin: "${ride.cancellationReason}"`,
      type: 'ride_status',
      relatedRide: ride._id
    });

    // Notify driver if assigned
    if (ride.driver) {
      const drv = await DriverProfile.findById(ride.driver);
      if (drv) {
        await createNotification({
          recipient: drv.user,
          title: 'Ride Cancelled by Admin',
          message: `Booking #${ride._id.toString().slice(-6)} was cancelled by administration.`,
          type: 'ride_status',
          relatedRide: ride._id
        });
      }
    }

    res.json({
      success: true,
      message: 'Ride cancelled by administrator',
      data: ride
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: Reassign ride to another approved online driver
// @route   PUT /api/admin/rides/:id/reassign
// @access  Private (Admin)
const reassignRide = async (req, res, next) => {
  try {
    const { driverId } = req.body;
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    const newDriver = await DriverProfile.findById(driverId).populate('user');
    if (!newDriver || newDriver.verificationStatus !== 'approved') {
      return res.status(400).json({ success: false, message: 'Target driver is not approved' });
    }

    const vehicle = await Vehicle.findOne({ driver: newDriver._id, verificationStatus: 'approved', isActive: true });
    if (!vehicle) {
      return res.status(400).json({ success: false, message: 'Target driver has no approved vehicle' });
    }

    ride.driver = newDriver._id;
    ride.vehicle = vehicle._id;
    ride.status = 'accepted';
    ride.acceptedAt = new Date();

    await ride.save();

    await logAudit({
      actor: req.user._id,
      action: 'REASSIGN_RIDE',
      targetType: 'Ride',
      targetId: ride._id,
      description: `Admin reassigned ride #${ride._id} to driver ${newDriver.user.firstName} ${newDriver.user.lastName}`,
      req
    });

    await createNotification({
      recipient: newDriver.user._id,
      title: 'Ride Assigned by Admin',
      message: `You have been manually assigned to a trip: Pickup at ${ride.pickup.address}.`,
      type: 'ride_status',
      relatedRide: ride._id
    });

    res.json({
      success: true,
      message: 'Ride reassigned successfully',
      data: ride
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: Manage Fare Rules (Create, Update, Delete)
const createFareRule = async (req, res, next) => {
  try {
    const { name, serviceType, baseFare, baseDistanceKm, perKmRate, perMinuteRate, minimumFare, bookingFee, peakMultiplier, peakStartTime, peakEndTime } = req.body;

    const rule = await FareRule.create({
      name,
      serviceType,
      baseFare: Number(baseFare),
      baseDistanceKm: Number(baseDistanceKm),
      perKmRate: Number(perKmRate),
      perMinuteRate: Number(perMinuteRate),
      minimumFare: Number(minimumFare),
      bookingFee: Number(bookingFee),
      peakMultiplier: Number(peakMultiplier) || 1.0,
      peakStartTime: peakStartTime || '07:00',
      peakEndTime: peakEndTime || '09:00',
      createdBy: req.user._id,
      isActive: true
    });

    await logAudit({
      actor: req.user._id,
      action: 'CREATE_FARE_RULE',
      targetType: 'FareRule',
      targetId: rule._id,
      description: `Admin created fare rule: ${name} for ${serviceType}`,
      req
    });

    res.status(201).json({ success: true, message: 'Fare rule created', data: rule });
  } catch (error) {
    next(error);
  }
};

const updateFareRule = async (req, res, next) => {
  try {
    const rule = await FareRule.findById(req.params.id);
    if (!rule) return res.status(404).json({ success: false, message: 'Fare rule not found' });

    Object.assign(rule, req.body);
    await rule.save();

    await logAudit({
      actor: req.user._id,
      action: 'UPDATE_FARE_RULE',
      targetType: 'FareRule',
      targetId: rule._id,
      description: `Admin updated fare rule: ${rule.name}`,
      req
    });

    res.json({ success: true, message: 'Fare rule updated', data: rule });
  } catch (error) {
    next(error);
  }
};

const deleteFareRule = async (req, res, next) => {
  try {
    const rule = await FareRule.findById(req.params.id);
    if (!rule) return res.status(404).json({ success: false, message: 'Fare rule not found' });

    rule.isActive = false;
    await rule.save();

    await logAudit({
      actor: req.user._id,
      action: 'DEACTIVATE_FARE_RULE',
      targetType: 'FareRule',
      targetId: rule._id,
      description: `Admin deactivated fare rule: ${rule.name}`,
      req
    });

    res.json({ success: true, message: 'Fare rule deactivated' });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: Manage Locations & Service Areas
const createLocation = async (req, res, next) => {
  try {
    const { name, type, address, barangay, latitude, longitude, aliases, isServiceArea } = req.body;

    const loc = await Location.create({
      name,
      type: type || 'landmark',
      address,
      barangay,
      latitude: Number(latitude),
      longitude: Number(longitude),
      aliases: Array.isArray(aliases) ? aliases : (aliases ? aliases.split(',').map(s => s.trim()) : []),
      isServiceArea: Boolean(isServiceArea),
      isActive: true
    });

    await logAudit({
      actor: req.user._id,
      action: 'CREATE_LOCATION',
      targetType: 'Location',
      targetId: loc._id,
      description: `Admin added location: ${name} (${barangay})`,
      req
    });

    res.status(201).json({ success: true, message: 'Location created', data: loc });
  } catch (error) {
    next(error);
  }
};

const updateLocation = async (req, res, next) => {
  try {
    const loc = await Location.findById(req.params.id);
    if (!loc) return res.status(404).json({ success: false, message: 'Location not found' });

    Object.assign(loc, req.body);
    await loc.save();

    await logAudit({
      actor: req.user._id,
      action: 'UPDATE_LOCATION',
      targetType: 'Location',
      targetId: loc._id,
      description: `Admin updated location: ${loc.name}`,
      req
    });

    res.json({ success: true, message: 'Location updated', data: loc });
  } catch (error) {
    next(error);
  }
};

const deleteLocation = async (req, res, next) => {
  try {
    const loc = await Location.findById(req.params.id);
    if (!loc) return res.status(404).json({ success: false, message: 'Location not found' });

    loc.isActive = false;
    await loc.save();

    await logAudit({
      actor: req.user._id,
      action: 'DEACTIVATE_LOCATION',
      targetType: 'Location',
      targetId: loc._id,
      description: `Admin deactivated location: ${loc.name}`,
      req
    });

    res.json({ success: true, message: 'Location deactivated' });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: Get operational reports
// @route   GET /api/admin/reports
// @access  Private (Admin)
const getAdminReports = async (req, res, next) => {
  try {
    // 7-day ride volume breakdown
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const ridesLast7Days = await Ride.aggregate([
      { $match: { requestedAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$requestedAt" } },
          totalRides: { $sum: 1 },
          completedRides: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
          },
          cancelledRides: {
            $sum: { $cond: [{ $regexMatch: { input: "$status", regex: /^cancelled/ } }, 1, 0] }
          },
          totalRevenue: {
            $sum: {
              $cond: [
                { $eq: ["$status", "completed"] },
                { $ifNull: ["$finalFare", "$estimatedFare"] },
                0
              ]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Service type popularity
    const serviceTypeBreakdown = await Ride.aggregate([
      {
        $group: {
          _id: "$serviceType",
          count: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } }
        }
      }
    ]);

    // Top pickup barangays
    const topBarangays = await Ride.aggregate([
      {
        $group: {
          _id: "$pickup.barangay",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        ridesLast7Days,
        serviceTypeBreakdown,
        topBarangays
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: Get Audit Logs
// @route   GET /api/admin/audit-logs
// @access  Private (Admin)
const getAuditLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const skip = (page - 1) * limit;

    const total = await AuditLog.countDocuments();
    const logs = await AuditLog.find()
      .populate('actor', 'firstName lastName username email role')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: Broadcast announcement/notification
// @route   POST /api/admin/broadcast
// @access  Private (Admin)
const broadcastAnnouncement = async (req, res, next) => {
  try {
    const { audience, title, message } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }

    let filter = { accountStatus: 'active' };
    if (audience === 'passenger') {
      filter.role = 'passenger';
    } else if (audience === 'driver') {
      filter.role = 'driver';
    }

    const recipients = await User.find(filter).select('_id');
    const notifPromises = recipients.map(u => 
      createNotification({
        recipient: u._id,
        title,
        message,
        type: 'announcement'
      })
    );
    await Promise.all(notifPromises);

    await logAudit({
      actor: req.user._id,
      action: 'BROADCAST_ANNOUNCEMENT',
      targetType: 'Notification',
      description: `Admin broadcasted "${title}" to ${audience} (${recipients.length} users)`,
      req
    });

    res.json({
      success: true,
      message: `Announcement broadcasted to ${recipients.length} user(s)`,
      count: recipients.length
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminDashboard,
  getAllUsers,
  updateUserStatus,
  getAllDrivers,
  approveDriver,
  rejectDriver,
  toggleSuspendDriver,
  getAllVehicles,
  adminCancelRide,
  reassignRide,
  createFareRule,
  updateFareRule,
  deleteFareRule,
  createLocation,
  updateLocation,
  deleteLocation,
  getAdminReports,
  getAuditLogs,
  broadcastAnnouncement
};