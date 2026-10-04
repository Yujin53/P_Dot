const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DriverProfile',
    required: true
  },
  vehicleType: {
    type: String,
    enum: ['tricycle', 'motorcycle', 'sedan', 'van_mpv'],
    required: true
  },
  make: {
    type: String,
    required: true,
    trim: true // e.g. Honda, Kawasaki, Toyota
  },
  model: {
    type: String,
    required: true,
    trim: true // e.g. TMX 125, Barako, Vios
  },
  year: {
    type: Number,
    required: true
  },
  color: {
    type: String,
    required: true,
    trim: true
  },
  plateNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  registrationReference: {
    type: String,
    required: true,
    trim: true
  },
  capacity: {
    type: Number,
    required: true,
    default: 1 // Tricycle: 3-4, Motorcycle: 1, Sedan: 4
  },
  photos: [{
    type: String
  }],
  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

vehicleSchema.index({ verificationStatus: 1 });
vehicleSchema.index({ driver: 1 });

module.exports = mongoose.model('Vehicle', vehicleSchema);
