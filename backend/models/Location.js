const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['barangay', 'landmark', 'school', 'hospital', 'mall', 'terminal', 'government_office', 'other'],
    default: 'landmark'
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  barangay: {
    type: String,
    required: true,
    trim: true
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  aliases: [{
    type: String,
    trim: true
  }],
  isServiceArea: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

locationSchema.index({ name: 'text', address: 'text', barangay: 'text', aliases: 'text' });
locationSchema.index({ name: 1 });
locationSchema.index({ barangay: 1 });
locationSchema.index({ isActive: 1 });
locationSchema.index({ isServiceArea: 1 });

module.exports = mongoose.model('Location', locationSchema);
