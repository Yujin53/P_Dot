const Ride = require('../models/Ride');
const User = require('../models/User');
const DriverProfile = require('../models/DriverProfile');
const Vehicle = require('../models/Vehicle');
const { calculateFare, calculateHaversineDistanceKm } = require('../services/fareService');
const { findEligibleDrivers, notifyEligibleDrivers } = require('../services/rideMatchingService');
const { createNotification } = require('../services/notificationService');
const { logAudit } = require('../services/auditService');

// @desc    Estimate fare before booking
// @route   POST /api/rides/estimate
// @access  Public or Private
const estimateFare = async (req, res, next) => {
  try {
    const { pickup, destination, serviceType } = req.body;

    if (!pickup || !destination) {
      return res.status(400).json({
        success: false,
        message: 'Pickup and destination are required',
        error: 'Validation failed'
      });
    }

    let distanceKm = 1.8;
    let durationMin = 7;

    if (pickup.latitude && pickup.longitude && destination.latitude && destination.longitude) {
      distanceKm = calculateHaversineDistanceKm(
        pickup.latitude,
        pickup.longitude,
        destination.latitude,
        destination.longitude
      );
      // Rough Tuguegarao city traffic duration: 3.5 mins per km
      durationMin = Math.max(3, Math.round(distanceKm * 3.5));
    }

    const estimate = await calculateFare({
      serviceType: serviceType || 'tricycle',
      distanceKm,
      durationMinutes: durationMin
    });

    res.json({
      success: true,
      data: estimate
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Passenger creates a new ride request
// @route   POST /api/rides
// @access  Private (Passenger)
const createRide = async (req, res, next) => {
  try {
    const {
      pickup,
      destination,
      serviceType = 'tricycle',
      passengerCount = 1,
      paymentMethod = 'cash',
      passengerNotes
    } = req.body;

    if (!pickup || !destination || !pickup.address || !destination.address) {
      return res.status(400).json({
        success: false,
        message: 'Pickup and destination addresses are required',
        error: 'Validation failed'
      });
    }

    if (pickup.address.trim().toLowerCase() === destination.address.trim().toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: 'Pickup and destination must not be identical',
        error: 'Identical locations'
      });
    }

    // Check if passenger already has active unresolved ride
    const existingActiveRide = await Ride.findOne({
      passenger: req.user._id,
      status: { $in: ['requested', 'searching', 'accepted', 'driver_arriving', 'driver_arrived', 'trip_started'] }
    });

    if (existingActiveRide) {
      return res.status(400).json({
        success: false,
        message: 'You already have an ongoing or searching ride. Please view or cancel it before booking a new one.',
        error: 'Active ride conflict',
        activeRideId: existingActiveRide._id
      });
    }

    // Calculate distance and fare
    let distanceKm = 1.8;
    let durationMin = 7;

    if (pickup.latitude && pickup.longitude && destination.latitude && destination.longitude) {
      distanceKm = calculateHaversineDistanceKm(
        pickup.latitude,
        pickup.longitude,
        destination.latitude,
        destination.longitude
      );
      durationMin = Math.max(3, Math.round(distanceKm * 3.5));
    }

    const { estimatedFare, fareBreakdown } = await calculateFare({
      serviceType,
      distanceKm,
      durationMinutes: durationMin
    });

    // Create ride
    const ride = await Ride.create({
      passenger: req.user._id,
      serviceType,
      pickup: {
        label: pickup.label || 'Pickup Location',
        address: pickup.address,
        barangay: pickup.barangay || 'Centro',
        landmark: pickup.landmark,
        latitude: pickup.latitude,
        longitude: pickup.longitude
      },
      destination: {
        label: destination.label || 'Destination',
        address: destination.address,
        barangay: destination.barangay || 'Carig Sur',
        landmark: destination.landmark,
        latitude: destination.latitude,
        longitude: destination.longitude
      },
      passengerCount: Number(passengerCount) || 1,
      estimatedDistanceKm: distanceKm,
      estimatedDurationMin: durationMin,
      estimatedFare,
      fareBreakdown,
      paymentMethod,
      passengerNotes,
      status: 'searching' // Initial status
    });

    // Find eligible drivers
    const eligibleDrivers = await findEligibleDrivers(ride);
    if (eligibleDrivers.length > 0) {
      await notifyEligibleDrivers(ride, eligibleDrivers);
    } else {
      // If no online drivers, still keep it searching briefly or let drivers see it when they open app
    }

    // Notify passenger
    await createNotification({
      recipient: req.user._id,
      title: 'Ride Request Created',
      message: `Searching for nearby ${serviceType} drivers around ${ride.pickup.barangay}...`,
      type: 'ride_status',
      relatedRide: ride._id
    });

    res.status(201).json({
      success: true,
      message: 'Ride requested successfully. Searching for drivers.',
      data: ride
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get rides list (with pagination, role filtering)
// @route   GET /api/rides
// @access  Private
const getRides = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;

    const query = {};

    // Role filtering
    if (req.user.role === 'passenger') {
      query.passenger = req.user._id;
    } else if (req.user.role === 'driver') {
      const profile = await DriverProfile.findOne({ user: req.user._id });
      if (!profile) return res.json({ success: true, data: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } });
      query.driver = profile._id;
    }

    // Additional query filters
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.serviceType) {
      query.serviceType = req.query.serviceType;
    }
    if (req.query.paymentStatus) {
      query.paymentStatus = req.query.paymentStatus;
    }
    if (req.query.barangay) {
      query.$or = [
        { 'pickup.barangay': new RegExp(req.query.barangay, 'i') },
        { 'destination.barangay': new RegExp(req.query.barangay, 'i') }
      ];
    }

    const total = await Ride.countDocuments(query);
    const rides = await Ride.find(query)
      .populate('passenger', 'firstName lastName phone profileImage')
      .populate({
        path: 'driver',
        populate: { path: 'user', select: 'firstName lastName phone profileImage' }
      })
      .populate('vehicle', 'make model color plateNumber vehicleType')
      .sort({ requestedAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      data: rides,
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

// @desc    Get single ride details
// @route   GET /api/rides/:id
// @access  Private
const getRideById = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate('passenger', 'firstName lastName phone profileImage')
      .populate({
        path: 'driver',
        populate: { path: 'user', select: 'firstName lastName phone profileImage' }
      })
      .populate('vehicle', 'make model color plateNumber vehicleType capacity');

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found',
        error: 'Not found'
      });
    }

    // Ownership check: must be the passenger, assigned driver, or admin
    const isPassenger = ride.passenger && ride.passenger._id.toString() === req.user._id.toString();
    const isDriver = ride.driver && ride.driver.user && ride.driver.user._id.toString() === req.user._id.toString();
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);

    // If searching, any online approved driver can view details to evaluate acceptance
    const isCandidateDriver = req.user.role === 'driver' && ['requested', 'searching'].includes(ride.status);

    if (!isPassenger && !isDriver && !isAdmin && !isCandidateDriver) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this ride',
        error: 'Forbidden'
      });
    }

    res.json({
      success: true,
      data: ride
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Driver accepts a ride
// @route   PUT /api/rides/:id/accept
// @access  Private (Driver)
const acceptRide = async (req, res, next) => {
  try {
    const profile = await DriverProfile.findOne({ user: req.user._id });
    if (!profile || profile.verificationStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Only approved drivers can accept ride bookings',
        error: 'Driver not approved'
      });
    }

    const vehicle = await Vehicle.findOne({ driver: profile._id, verificationStatus: 'approved', isActive: true });
    if (!vehicle) {
      return res.status(403).json({
        success: false,
        message: 'No approved vehicle found for this driver',
        error: 'No vehicle'
      });
    }

    // Check if driver is already on an active trip
    const activeTrip = await Ride.findOne({
      driver: profile._id,
      status: { $in: ['accepted', 'driver_arriving', 'driver_arrived', 'trip_started'] }
    });

    if (activeTrip) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active trip. Complete or cancel it first.',
        error: 'Driver busy'
      });
    }

    // ATOMIC UPDATE to prevent race conditions (two drivers accepting same ride)
    const updatedRide = await Ride.findOneAndUpdate(
      {
        _id: req.params.id,
        status: { $in: ['requested', 'searching'] }
      },
      {
        $set: {
          driver: profile._id,
          vehicle: vehicle._id,
          status: 'accepted',
          acceptedAt: new Date()
        }
      },
      { new: true }
    )
    .populate('passenger', 'firstName lastName phone profileImage')
    .populate({
      path: 'driver',
      populate: { path: 'user', select: 'firstName lastName phone profileImage' }
    })
    .populate('vehicle');

    if (!updatedRide) {
      return res.status(409).json({
        success: false,
        message: 'This ride has already been accepted by another driver or was cancelled.',
        error: 'Conflict'
      });
    }

    // Notify passenger
    await createNotification({
      recipient: updatedRide.passenger._id,
      title: 'Driver Found!',
      message: `${req.user.firstName} accepted your booking with a ${vehicle.color} ${vehicle.make} ${vehicle.model} (${vehicle.plateNumber}).`,
      type: 'ride_status',
      relatedRide: updatedRide._id
    });

    res.json({
      success: true,
      message: 'Ride accepted successfully',
      data: updatedRide
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update ride status (arriving, arrived, started, completed)
// @route   PUT /api/rides/:id/status
// @access  Private (Driver or Admin)
const updateRideStatus = async (req, res, next) => {
  try {
    const { status, paymentStatus, paymentReference, finalFare, driverNotes } = req.body;

    const ride = await Ride.findById(req.params.id);
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    let driverProfile = null;

    if (!isAdmin) {
      driverProfile = await DriverProfile.findOne({ user: req.user._id });
      if (!driverProfile || !ride.driver || ride.driver.toString() !== driverProfile._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this ride status',
          error: 'Forbidden'
        });
      }
    }

    // State machine transitions validation
    const validTransitions = {
      'accepted': ['driver_arriving', 'cancelled_by_driver', 'cancelled_by_admin'],
      'driver_arriving': ['driver_arrived', 'cancelled_by_driver', 'cancelled_by_admin'],
      'driver_arrived': ['trip_started', 'cancelled_by_driver', 'cancelled_by_admin'],
      'trip_started': ['completed', 'cancelled_by_admin'] // Once started, only completion or admin intervention
    };

    if (status) {
      const allowedNext = validTransitions[ride.status];
      if (!allowedNext || !allowedNext.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status transition from '${ride.status}' to '${status}'`,
          error: 'Invalid transition'
        });
      }

      ride.status = status;

      // Update timestamps
      if (status === 'driver_arriving') {
        ride.arrivedAt = null;
      } else if (status === 'driver_arrived') {
        ride.arrivedAt = new Date();
      } else if (status === 'trip_started') {
        ride.startedAt = new Date();
      } else if (status === 'completed') {
        ride.completedAt = new Date();
        ride.finalFare = Number(finalFare) || ride.estimatedFare;
        ride.paymentStatus = paymentStatus || 'paid';
        if (paymentReference) ride.paymentReference = paymentReference;

        // Increment driver total completed trips
        if (driverProfile) {
          driverProfile.totalTripsCompleted = (driverProfile.totalTripsCompleted || 0) + 1;
          await driverProfile.save();
        } else if (ride.driver) {
          await DriverProfile.findByIdAndUpdate(ride.driver, { $inc: { totalTripsCompleted: 1 } });
        }
      }
    }

    if (driverNotes) ride.driverNotes = driverNotes;

    await ride.save();

    // Populate for response
    const populated = await Ride.findById(ride._id)
      .populate('passenger', 'firstName lastName phone profileImage')
      .populate({
        path: 'driver',
        populate: { path: 'user', select: 'firstName lastName phone profileImage' }
      })
      .populate('vehicle');

    // Send notifications to passenger
    const statusMessages = {
      driver_arriving: 'Your driver is on the way to your pickup location.',
      driver_arrived: 'Your driver has arrived at your pickup spot!',
      trip_started: 'Your trip has started. Safe travels with P_Dot!',
      completed: `You have arrived at your destination! Total fare: PHP ${ride.finalFare || ride.estimatedFare}. Don't forget to rate your trip.`
    };

    if (statusMessages[status]) {
      await createNotification({
        recipient: ride.passenger,
        title: `Trip Update: ${status.replace('_', ' ').toUpperCase()}`,
        message: statusMessages[status],
        type: 'ride_status',
        relatedRide: ride._id
      });
    }

    res.json({
      success: true,
      message: `Ride status updated to ${status}`,
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel a ride (by passenger, driver, or admin)
// @route   PUT /api/rides/:id/cancel
// @access  Private
const cancelRide = async (req, res, next) => {
  try {
    const { cancellationReason } = req.body;
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    // Rules: Completed ride cannot be cancelled
    if (ride.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'A completed ride cannot be cancelled',
        error: 'Invalid action'
      });
    }

    if (ride.status.startsWith('cancelled')) {
      return res.status(400).json({
        success: false,
        message: 'Ride is already cancelled',
        error: 'Already cancelled'
      });
    }

    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    const isPassenger = ride.passenger.toString() === req.user._id.toString();

    let isDriver = false;
    let driverProfile = null;
    if (req.user.role === 'driver') {
      driverProfile = await DriverProfile.findOne({ user: req.user._id });
      if (driverProfile && ride.driver && ride.driver.toString() === driverProfile._id.toString()) {
        isDriver = true;
      }
    }

    if (!isPassenger && !isDriver && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this ride',
        error: 'Forbidden'
      });
    }

    // Cancellation reasons validation
    if (isDriver && !cancellationReason) {
      return res.status(400).json({
        success: false,
        message: 'A cancellation reason is required for drivers',
        error: 'Reason required'
      });
    }

    // Trip started rule: passengers cannot cancel after trip started without admin
    if (ride.status === 'trip_started' && isPassenger && !isAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Trip is already in progress. Please contact P_Dot support to report an emergency or dispute.',
        error: 'Trip in progress'
      });
    }

    let newStatus = 'cancelled_by_passenger';
    if (isDriver) newStatus = 'cancelled_by_driver';
    if (isAdmin) newStatus = 'cancelled_by_admin';

    ride.status = newStatus;
    ride.cancelledAt = new Date();
    ride.cancelledBy = req.user._id;
    ride.cancellationReason = cancellationReason || 'Cancelled by user';

    await ride.save();

    // Notify parties
    if (isPassenger && ride.driver) {
      const drv = await DriverProfile.findById(ride.driver);
      if (drv) {
        await createNotification({
          recipient: drv.user,
          title: 'Ride Cancelled by Passenger',
          message: `The booking was cancelled: "${ride.cancellationReason}"`,
          type: 'ride_status',
          relatedRide: ride._id
        });
      }
    } else if (isDriver) {
      await createNotification({
        recipient: ride.passenger,
        title: 'Ride Cancelled by Driver',
        message: `Your driver had to cancel: "${ride.cancellationReason}". You can request another ride now.`,
        type: 'ride_status',
        relatedRide: ride._id
      });
    }

    res.json({
      success: true,
      message: 'Ride cancelled successfully',
      data: ride
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get ride printable/downloadable summary receipt
// @route   GET /api/rides/:id/summary
// @access  Private
const getRideSummary = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate('passenger', 'firstName lastName phone email')
      .populate({
        path: 'driver',
        populate: { path: 'user', select: 'firstName lastName phone' }
      })
      .populate('vehicle');

    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    res.json({
      success: true,
      data: {
        receiptNumber: `PDOT-${ride._id.toString().slice(-8).toUpperCase()}`,
        date: ride.completedAt || ride.requestedAt,
        serviceType: ride.serviceType,
        passengerName: `${ride.passenger.firstName} ${ride.passenger.lastName}`,
        passengerPhone: ride.passenger.phone,
        driverName: ride.driver ? `${ride.driver.user.firstName} ${ride.driver.user.lastName}` : 'Unassigned',
        driverPhone: ride.driver ? ride.driver.user.phone : 'N/A',
        vehicleDetails: ride.vehicle ? `${ride.vehicle.color} ${ride.vehicle.make} ${ride.vehicle.model} (${ride.vehicle.plateNumber})` : 'N/A',
        pickup: ride.pickup,
        destination: ride.destination,
        estimatedDistanceKm: ride.estimatedDistanceKm,
        estimatedDurationMin: ride.estimatedDurationMin,
        fareBreakdown: ride.fareBreakdown,
        totalFare: ride.finalFare || ride.estimatedFare,
        paymentMethod: ride.paymentMethod,
        paymentStatus: ride.paymentStatus,
        paymentReference: ride.paymentReference || 'N/A',
        status: ride.status,
        currency: 'PHP',
        city: 'Tuguegarao City, Cagayan'
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  estimateFare,
  createRide,
  getRides,
  getRideById,
  acceptRide,
  updateRideStatus,
  cancelRide,
  getRideSummary
};
