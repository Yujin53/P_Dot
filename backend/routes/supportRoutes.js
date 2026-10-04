const express = require('express');
const router = express.Router();
const {
  createTicket,
  getMyTickets,
  getTicketById,
  updateTicket
} = require('../controllers/supportController');
const { protect } = require('../middleware/authMiddleware');
const { uploadSupport } = require('../middleware/uploadMiddleware');

router.use(protect);

router.route('/tickets')
  .get(getMyTickets)
  .post(uploadSupport.array('attachments', 3), createTicket);

router.route('/tickets/:id')
  .get(getTicketById)
  .put(updateTicket);

module.exports = router;
