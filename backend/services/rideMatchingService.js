const DriverProfile = require('../models/DriverProfile');
const Vehicle = require('../models/Vehicle');
const Ride = require('../models/Ride');
const { calculateHaversineDistanceKm } = require('./fareService');
const { createNotification } = require('./notificationService');

/**
 * Finds eligible online drivers for a ride request
 */
const findEligibleDrivers = async (ride) => {
  try {
    // 1. Find all active vehicles matching the requested serviceType
    const vehicles = await Vehicle.find({
      vehicleType: ride.serviceType,
      verificationStatus: 'approved',
      isActive: true
    }).populate('driver');

    if (!vehicles || vehicles.length === 0) {
      return [];
    }

    const driverIds = vehicles.map(v => v.driver._id);

    // 2. Find online & approved drivers not currently on an active trip and not having declined this ride
    const declined = ride.declinedDrivers || [];

    // Check drivers who currently have active rides
    const activeTrips = await Ride.find({
      status: { $in: ['accepted', 'driver_arriving', 'driver_arrived', 'trip_started'] }
    }).select('driver');

    const busyDriverIds = activeTrips
      .filter(t => t.driver)
      .map(t => t.driver.toString());

    const drivers = await DriverProfile.find({
      _id: { 
        $in: driverIds, 
        $nin: [...declined, ...busyDriverIds] 
      },
      applicationStatus: 'approved',
      verificationStatus: 'approved',
      isOnline: true
    }).populate('user', 'firstName lastName phone profileImage');

    // 3. Sort by distance to pickup if coordinates exist
    if (ride.pickup.latitude && ride.pickup.longitude) {
      drivers.sort((a, b) => {
        const distA = calculateHaversineDistanceKm(
          ride.pickup.latitude,
          ride.pickup.longitude,
          a.lastKnownLocation?.latitude || 17.6132,
          a.lastKnownLocation?.longitude || 121.7270
        );
        const distB = calculateHaversineDistanceKm(
          ride.pickup.latitude,
          ride.pickup.longitude,
          b.lastKnownLocation?.latitude || 17.6132,
          b.lastKnownLocation?.longitude || 121.7270
        );
        return distA - distB;
      });
    }

    return drivers;
  } catch (error) {
    console.error('[RideMatchingService Error] findEligibleDrivers:', error.message);
    return [];
  }
};

/**
 * Notifies eligible drivers about a new or pending ride
 */
const notifyEligibleDrivers = async (ride, eligibleDrivers) => {
  try {
    for (const drv of eligibleDrivers) {
      if (drv.user && drv.user._id) {
        await createNotification({
          recipient: drv.user._id,
          title: 'New Ride Request Available!',
          message: `Pickup: ${ride.pickup.label || ride.pickup.address} (${ride.pickup.barangay || 'Tuguegarao'}). Estimated Fare: PHP ${ride.estimatedFare}`,
          type: 'ride_status',
          relatedRide: ride._id
        });
      }
    }
  } catch (error) {
    console.error('[RideMatchingService Error] notifyEligibleDrivers:', error.message);
  }
};

module.exports = {
  findEligibleDrivers,
  notifyEligibleDrivers
};
