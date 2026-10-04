const mongoose = require('mongoose');

// Helper to validate Philippine mobile numbers (+639xxxxxxxxx, 09xxxxxxxxx, 9xxxxxxxxx)
const isValidPhPhone = (phone) => {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s-]/g, '');
  return /^(09|\+639|639)\d{9}$/.test(cleaned);
};

// Helper to validate email format
const isValidEmail = (email) => {
  return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);
};

// Middleware to check required fields in req.body
const validateRequired = (fields) => {
  return (req, res, next) => {
    const missing = [];
    for (const field of fields) {
      if (req.body[field] === undefined || req.body[field] === null || String(req.body[field]).trim() === '') {
        missing.push(field);
      }
    }
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required field(s): ${missing.join(', ')}`,
        error: 'Validation failed',
        missingFields: missing
      });
    }
    next();
  };
};

// Validate MongoDB ObjectId parameter
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ID parameter format for ${paramName}`,
        error: 'Invalid ObjectId'
      });
    }
    next();
  };
};

module.exports = {
  isValidPhPhone,
  isValidEmail,
  validateRequired,
  validateObjectId
};
