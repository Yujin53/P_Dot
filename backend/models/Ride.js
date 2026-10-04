const mongoose = require('mongoose');

const pointSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true },
  address: { type: String, required: true, trim: true },
  barangay: { type: String, trim: true },
  landmark: { type: String, trim: true },
  latitude: { type: Number },
  longitude: { type: Number }
}, { _id: false });

const rideSchema = new mongoose.Schema({
  passenger: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DriverProfile'
  },
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle'
  },
  serviceType: {
    type: String,
    enum: ['tricycle', 'motorcycle', 'sedan', 'van_mpv'],
    default: 'tricycle'
  },
  pickup: {
    type: pointSchema,
    required: true
  },
  destination: {
    type: pointSchema,
    required: true
  },
  passengerCount: {
    type: Number,
    default: 1
  },
  estimatedDistanceKm: {
    type: Number,
    required: true,
    default: 1.0
  },
  estimatedDurationMin: {
    type: Number,
    required: true,
    default: 5
  },
  estimatedFare: {
    type: Number,
    required: true
  },
  finalFare: {
    type: Number
  },
  fareBreakdown: {
    baseFare: Number,
    distanceCharge: Number,
    timeCharge: Number,
    bookingFee: Number,
    peakAdjustment: Number,
    minimumFareApplied: Boolean
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'recorded_digital_payment', 'other'],
    default: 'cash'
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'paid', 'recorded', 'refunded', 'not_applicable'],
    default: 'unpaid'
  },
  paymentReference: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: [
      'requested',
      'searching',
      'accepted',
      'driver_arriving',
      'driver_arrived',
      'trip_started',
      'completed',
      'cancelled_by_passenger',
      'cancelled_by_driver',
      'cancelled_by_admin',
      'no_driver_available'
    ],
    default: 'requested'
  },
  requestedAt: { type: Date, default: Date.now },
  acceptedAt: { type: Date },
  arrivedAt: { type: Date },
  startedAt: { type: Date },
  completedAt: { type: Date },
  cancelledAt: { type: Date },
  cancellationReason: { type: String, trim: true },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  passengerNotes: { type: String, trim: true },
  driverNotes: { type: String, trim: true },
  declinedDrivers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DriverProfile'
  }]
}, {
  timestamps: true
});

rideSchema.index({ passenger: 1 });
rideSchema.index({ driver: 1 });
rideSchema.index({ status: 1 });
rideSchema.index({ requestedAt: -1 });
rideSchema.index({ 'pickup.barangay': 1 });
rideSchema.index({ 'destination.barangay': 1 });

module.exports = mongoose.model('Ride', rideSchema);
