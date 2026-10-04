const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ride: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride'
  },
  category: {
    type: String,
    enum: ['fare_dispute', 'driver_behavior', 'passenger_behavior', 'lost_item', 'safety_concern', 'app_issue', 'other'],
    default: 'other'
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  attachments: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['open', 'in_review', 'resolved', 'closed'],
    default: 'open'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolution: {
    type: String,
    trim: true
  },
  closedAt: {
    type: Date
  }
}, {
  timestamps: true
});

supportTicketSchema.index({ status: 1 });
supportTicketSchema.index({ createdBy: 1 });
supportTicketSchema.index({ assignedTo: 1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
