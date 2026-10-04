const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    trim: true // e.g. "APPROVE_DRIVER", "UPDATE_FARE_RULE", "CANCEL_RIDE_ADMIN"
  },
  targetType: {
    type: String,
    required: true,
    trim: true // e.g. "DriverProfile", "FareRule", "User", "Ride", "Location"
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  ipAddress: {
    type: String,
    default: '127.0.0.1'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false
});

auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ actor: 1 });
auditLogSchema.index({ targetType: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
