const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'pdot_super_secret_jwt_key_tuguegarao_2026_xyz987');

      // Fetch user without password
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User no longer exists',
          error: 'Invalid token'
        });
      }

      // Check account status
      if (user.accountStatus === 'disabled' || user.accountStatus === 'suspended') {
        return res.status(403).json({
          success: false,
          message: `Your account has been ${user.accountStatus}. Please contact P_Dot support.`,
          error: 'Account inactive'
        });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('[AuthMiddleware] Error:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed or expired',
        error: error.message
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no bearer token provided',
      error: 'Token required'
    });
  }
};

module.exports = { protect };
