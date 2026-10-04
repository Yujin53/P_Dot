const SupportTicket = require('../models/SupportTicket');
const { createNotification } = require('../services/notificationService');
const { logAudit } = require('../services/auditService');

// @desc    Create support ticket
// @route   POST /api/support/tickets
// @access  Private
const createTicket = async (req, res, next) => {
  try {
    const { category, subject, description, rideId } = req.body;

    if (!subject || !description) {
      return res.status(400).json({
        success: false,
        message: 'Subject and description are required',
        error: 'Validation failed'
      });
    }

    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = req.files.map(f => `/uploads/support/${f.filename}`);
    }

    const ticket = await SupportTicket.create({
      createdBy: req.user._id,
      ride: rideId || undefined,
      category: category || 'other',
      subject,
      description,
      attachments,
      status: 'open'
    });

    res.status(201).json({
      success: true,
      message: 'Support ticket submitted. Our local support team will review it shortly.',
      data: ticket
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's support tickets
// @route   GET /api/support/tickets
// @access  Private
const getMyTickets = async (req, res, next) => {
  try {
    const tickets = await SupportTicket.find({ createdBy: req.user._id })
      .populate('ride', 'pickup destination finalFare status requestedAt')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: tickets
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single ticket details
// @route   GET /api/support/tickets/:id
// @access  Private
const getTicketById = async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email phone role')
      .populate('assignedTo', 'firstName lastName email')
      .populate('ride');

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Authorization
    const isOwner = ticket.createdBy && ticket.createdBy._id.toString() === req.user._id.toString();
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    res.json({
      success: true,
      data: ticket
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update support ticket (User add comment/info, or Admin resolve)
// @route   PUT /api/support/tickets/:id
// @access  Private
const updateTicket = async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    const isOwner = ticket.createdBy.toString() === req.user._id.toString();

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    if (isAdmin) {
      if (req.body.status) ticket.status = req.body.status;
      if (req.body.resolution) ticket.resolution = req.body.resolution;
      if (req.body.assignedTo) ticket.assignedTo = req.body.assignedTo;
      if (req.body.status === 'resolved' || req.body.status === 'closed') {
        ticket.closedAt = new Date();
      }

      await logAudit({
        actor: req.user._id,
        action: 'SUPPORT_TICKET_UPDATED',
        targetType: 'SupportTicket',
        targetId: ticket._id,
        description: `Admin updated ticket #${ticket._id} to ${ticket.status}`,
        req
      });

      // Notify ticket owner
      await createNotification({
        recipient: ticket.createdBy,
        title: `Support Ticket Updated: ${ticket.subject}`,
        message: `Your ticket status is now ${ticket.status}. Resolution: ${ticket.resolution || 'Under review'}`,
        type: 'ticket_update'
      });
    } else {
      // Owner adding info
      if (req.body.description) {
        ticket.description += `\n\n[Update ${new Date().toLocaleDateString()}]: ${req.body.description}`;
      }
    }

    await ticket.save();

    res.json({
      success: true,
      message: 'Ticket updated successfully',
      data: ticket
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTicket,
  getMyTickets,
  getTicketById,
  updateTicket
};
