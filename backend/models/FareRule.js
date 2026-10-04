const mongoose = require('mongoose');

const fareRuleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  serviceType: {
    type: String,
    enum: ['tricycle', 'motorcycle', 'sedan', 'van_mpv'],
    required: true
  },
  baseFare: {
    type: Number,
    required: true,
    min: 0,
    default: 15.0 // Tuguegarao Tricycle standard base
  },
  baseDistanceKm: {
    type: Number,
    required: true,
    min: 0,
    default: 1.0 // Covers first 1 km
  },
  perKmRate: {
    type: Number,
    required: true,
    min: 0,
    default: 5.0 // PHP per succeeding km
  },
  perMinuteRate: {
    type: Number,
    required: true,
    min: 0,
    default: 1.0 // PHP per minute
  },
  minimumFare: {
    type: Number,
    required: true,
    min: 0,
    default: 15.0
  },
  bookingFee: {
    type: Number,
    required: true,
    min: 0,
    default: 5.0
  },
  peakMultiplier: {
    type: Number,
    required: true,
    min: 1.0,
    default: 1.0
  },
  peakStartTime: {
    type: String, // "07:00"
    default: "07:00"
  },
  peakEndTime: {
    type: String, // "09:00"
    default: "09:00"
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

fareRuleSchema.index({ serviceType: 1, isActive: 1 });

module.exports = mongoose.model('FareRule', fareRuleSchema);
