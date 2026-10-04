const mongoose = require('mongoose');

const driverProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  applicationStatus: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected', 'suspended'],
    default: 'pending'
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected', 'suspended'],
    default: 'pending'
  },
  licenseReference: {
    type: String,
    required: true,
    trim: true
  },
  governmentIdReference: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  emergencyContactName: {
    type: String,
    required: true,
    trim: true
  },
  emergencyContactPhone: {
    type: String,
    required: true,
    trim: true
  },
  documents: [{
    docType: { 
      type: String, 
      enum: ['driver_license', 'government_id', 'nbi_or_police_clearance', 'vehicle_orcr', 'other'],
      required: true 
    },
    title: { type: String, required: true },
    filePath: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
    isVerified: { type: Boolean, default: false }
  }],
  isOnline: {
    type: Boolean,
    default: false
  },
  lastKnownLocation: {
    latitude: { type: Number, default: 17.6132 }, // Tuguegarao default
    longitude: { type: Number, default: 121.7270 },
    barangay: { type: String, default: 'Centro' },
    updatedAt: { type: Date, default: Date.now }
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  rejectionReason: {
    type: String,
    trim: true
  },
  totalTripsCompleted: {
    type: Number,
    default: 0
  },
  averageRating: {
    type: Number,
    default: 5.0
  },
  totalRatingsCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

driverProfileSchema.index({ applicationStatus: 1 });
driverProfileSchema.index({ verificationStatus: 1 });
driverProfileSchema.index({ isOnline: 1 });

module.exports = mongoose.model('DriverProfile', driverProfileSchema);
