const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password_hash');

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
      }

      if (req.user.is_blocked) {
        return res.status(403).json({
          success: false,
          message: 'Your account has been blocked',
          reason: req.user.block_reason || 'Violation of terms',
        });
      }

      if (req.user.account_status === 'SUSPENDED') {
        return res.status(403).json({
          success: false,
          message: 'Your account has been suspended',
        });
      }

      req.userId = req.user._id.toString();
      try {
        const { trackActivity } = require('./activity.middleware');
        await trackActivity(req, res, () => {});
      } catch (activityErr) {
        console.error('Error tracking activity in protect:', activityErr.message);
      }
      next();
    } catch (error) {
      console.error('Auth middleware error:', error.message);
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password_hash');
      if (req.user) {
        req.userId = req.user._id.toString();
        try {
          const { trackActivity } = require('./activity.middleware');
          await trackActivity(req, res, () => {});
        } catch (activityErr) {
          console.error('Error tracking activity in optionalAuth:', activityErr.message);
        }
      }
    }
  } catch (error) {
    // Silent fail for optional auth
  }
  next();
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action',
      });
    }
    next();
  };
};

module.exports = { protect, optionalAuth, restrictTo };
