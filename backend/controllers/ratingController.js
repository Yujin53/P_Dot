const Rating = require('../models/Rating');
const Ride = require('../models/Ride');
const DriverProfile = require('../models/DriverProfile');
const { createNotification } = require('../services/notificationService');

// @desc    Submit rating for a completed ride
// @route   POST /api/ratings
// @access  Private (Passenger)
const createRating = async (req, res, next) => {
  try {
    const { rideId, rating, comment } = req.body;

    if (!rideId || !rating) {
      return res.status(400).json({
        success: false,
        message: 'Ride ID and rating score (1-5) are required',
        error: 'Validation failed'
      });
    }

    const numRating = Number(rating);
    if (numRating < 1 || numRating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating score must be between 1 and 5',
        error: 'Invalid rating range'
      });
    }

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    // Rules: Passenger only, must be completed, must be the passenger of the ride
    if (ride.passenger.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only rate rides you personally requested',
        error: 'Forbidden'
      });
    }

    if (ride.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot rate a ride that is not completed',
        error: 'Trip not completed'
      });
    }

    if (!ride.driver) {
      return res.status(400).json({
        success: false,
        message: 'No driver assigned to this ride',
        error: 'Missing driver'
      });
    }

    // Check if already rated
    const existingRating = await Rating.findOne({ ride: ride._id });
    if (existingRating) {
      return res.status(409).json({
        success: false,
        message: 'You have already rated this trip',
        error: 'Already rated'
      });
    }

    const newRating = await Rating.create({
      ride: ride._id,
      passenger: req.user._id,
      driver: ride.driver,
      rating: numRating,
      comment: comment ? comment.trim() : '',
      submittedBy: req.user._id
    });

    // Update driver profile aggregate rating
    const allDriverRatings = await Rating.find({ driver: ride.driver });
    const count = allDriverRatings.length;
    const avg = count > 0 ? (allDriverRatings.reduce((sum, r) => sum + r.rating, 0) / count) : 5.0;

    const driverProfile = await DriverProfile.findById(ride.driver);
    if (driverProfile) {
      driverProfile.averageRating = Math.round(avg * 10) / 10;
      driverProfile.totalRatingsCount = count;
      await driverProfile.save();

      // Notify driver of feedback
      await createNotification({
        recipient: driverProfile.user,
        title: 'New Trip Rating Received',
        message: `You received a ${numRating}-star rating for your recent trip!`,
        type: 'general',
        relatedRide: ride._id
      });
    }

    res.status(201).json({
      success: true,
      message: 'Rating submitted successfully. Thank you for your feedback!',
      data: newRating
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get passenger's submitted ratings
// @route   GET /api/ratings/my
// @access  Private
const getMyRatings = async (req, res, next) => {
  try {
    const ratings = await Rating.find({ passenger: req.user._id })
      .populate('ride', 'pickup destination completedAt finalFare serviceType')
      .populate({
        path: 'driver',
        populate: { path: 'user', select: 'firstName lastName profileImage' }
      })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: ratings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get public/driver aggregated ratings
// @route   GET /api/ratings/driver/:driverId
// @access  Public or Private
const getDriverRatings = async (req, res, next) => {
  try {
    const ratings = await Rating.find({ driver: req.params.driverId })
      .populate('passenger', 'firstName profileImage') // Only first name for privacy
      .sort({ createdAt: -1 })
      .limit(30);

    const count = ratings.length;
    const avg = count > 0 ? (ratings.reduce((sum, r) => sum + r.rating, 0) / count) : 5.0;

    res.json({
      success: true,
      data: {
        averageRating: Math.round(avg * 10) / 10,
        totalRatings: count,
        reviews: ratings
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRating,
  getMyRatings,
  getDriverRatings
};
