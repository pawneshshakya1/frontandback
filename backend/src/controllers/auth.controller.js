const authService = require('../services/auth.service');
const userSessionService = require('../services/user-session.service');
const STATUS_CODES = require('../utils/statusCodes');

const register = async (req, res) => {
  try {
    const { username, email, password } = req.body || {};
    if (!username || !email || !password) {
      return res.sendError(new Error('Validation error'), 'username, email and password are required', STATUS_CODES.BAD_REQUEST);
    }
    if (String(password).length < 6) {
      return res.sendError(new Error('Validation error'), 'Password must be at least 6 characters', STATUS_CODES.BAD_REQUEST);
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(email))) {
      return res.sendError(new Error('Validation error'), 'Invalid email format', STATUS_CODES.BAD_REQUEST);
    }
    const result = await authService.registerUser({ username, email, password });
    res.sendSuccess(result, 'User registered successfully', STATUS_CODES.CREATED);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.sendError(new Error('Validation error'), 'email and password are required', STATUS_CODES.BAD_REQUEST);
    }
    let deviceInfo = null;
    const deviceHeader = req.headers['x-device-info'];
    if (deviceHeader) {
      try {
        deviceInfo = typeof deviceHeader === 'string' ? JSON.parse(deviceHeader) : deviceHeader;
      } catch (e) {
        deviceInfo = { raw: String(deviceHeader) };
      }
    }
    const ip = req.ip || req.connection?.remoteAddress;

    const result = await authService.loginUser(email, password, deviceInfo, ip);
    res.sendSuccess(result, 'Login successful', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.UNAUTHORIZED);
  }
};

const googleLogin = async (req, res) => {
  try {
    const { token } = req.body;
    const result = await authService.loginWithGoogle(token);
    res.sendSuccess(result, 'Google login successful', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.UNAUTHORIZED);
  }
};

const facebookLogin = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) throw new Error('Facebook token is required');
    const result = await authService.loginWithProvider('facebook.com', token);
    res.sendSuccess(result, 'Facebook login successful', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.UNAUTHORIZED);
  }
};

const appleLogin = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) throw new Error('Apple token is required');
    const result = await authService.loginWithProvider('apple.com', token);
    res.sendSuccess(result, 'Apple login successful', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.UNAUTHORIZED);
  }
};

const logout = async (req, res) => {
  try {
    if (req.userId) {
      await userSessionService.markOffline(req.userId);
    }
    res.sendSuccess(null, 'Logged out successfully', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const sendEmailChangeOTP = async (req, res) => {
  try {
    const User = require('../models/user.model');
    const OtpVerification = require('../models/otp-verification.model');
    const user = await User.findById(req.userId);
    if (!user) throw new Error('User not found');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await OtpVerification.create({
      user_id: req.userId,
      otp,
      purpose: 'EMAIL_CHANGE',
      expires_at: Date.now() + 10 * 60 * 1000,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    });

    const emailService = require('../services/email.service');
    await emailService.sendEmail({
      to: user.email,
      subject: 'Email Change OTP',
      text: `Your OTP for changing email is ${otp}. It expires in 10 minutes.`,
      html: `<p>Your OTP for changing email is <b>${otp}</b>. It expires in 10 minutes.</p>`,
    });

    res.sendSuccess({ message: 'OTP sent to current email' }, 'OTP sent', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const verifyEmailChangeOTP = async (req, res) => {
  try {
    const { newEmail, otp } = req.body;
    if (!newEmail || !otp) throw new Error('New email and OTP are required');

    const OtpVerification = require('../models/otp-verification.model');
    const otpRecord = await OtpVerification.findOne({
      user_id: req.userId,
      purpose: 'EMAIL_CHANGE',
      is_used: false,
      otp: String(otp).trim(),
      expires_at: { $gt: Date.now() },
    }).sort({ created_at: -1 });

    if (!otpRecord) throw new Error('Invalid or expired OTP');

    const User = require('../models/user.model');
    const existing = await User.findOne({ email: newEmail.toLowerCase(), _id: { $ne: req.userId } });
    if (existing) throw new Error('Email already in use');

    await User.findByIdAndUpdate(req.userId, { email: newEmail.toLowerCase() });
    otpRecord.is_used = true;
    await otpRecord.save();

    res.sendSuccess({ message: 'Email updated successfully' }, 'Email changed', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const getMe = async (req, res) => {
  try {
    const User = require('../models/user.model');
    const user = await User.findById(req.userId).select('-password_hash');
    if (!user) throw new Error('User not found');
    res.sendSuccess(user, 'User retrieved', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.sendError(new Error('Validation error'), 'Email is required', STATUS_CODES.BAD_REQUEST);
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(email).toLowerCase())) {
      return res.sendError(new Error('Validation error'), 'Invalid email format', STATUS_CODES.BAD_REQUEST);
    }

    const User = require('../models/user.model');
    const OtpVerification = require('../models/otp-verification.model');
    const emailService = require('../services/email.service');
    const crypto = require('crypto');

    const user = await User.findOne({ email: String(email).toLowerCase() });

    // Always return the same success message to prevent email enumeration
    if (!user) {
      return res.sendSuccess({ message: 'If an account exists for that email, a password reset code has been sent.' }, 'OK', STATUS_CODES.OK);
    }

    // Invalidate any previous unused PASSWORD_RESET OTPs for this user
    await OtpVerification.updateMany(
      { user_id: user._id, purpose: 'PASSWORD_RESET', is_used: false },
      { $set: { is_used: true } }
    );

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await OtpVerification.create({
      user_id: user._id,
      otp,
      purpose: 'PASSWORD_RESET',
      expires_at: Date.now() + 10 * 60 * 1000,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    });

    await emailService.sendEmail({
      to: user.email,
      subject: 'Password Reset Code',
      text: `Your password reset code is ${otp}. It expires in 10 minutes. If you did not request this, you can safely ignore this email.`,
      html: `<p>Your password reset code is <b>${otp}</b>. It expires in 10 minutes.</p><p>If you did not request this, you can safely ignore this email.</p>`,
    });

    return res.sendSuccess({ message: 'If an account exists for that email, a password reset code has been sent.' }, 'OK', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body || {};
    if (!email || !otp || !newPassword) {
      return res.sendError(new Error('Validation error'), 'email, otp and newPassword are required', STATUS_CODES.BAD_REQUEST);
    }
    if (String(newPassword).length < 6) {
      return res.sendError(new Error('Validation error'), 'Password must be at least 6 characters', STATUS_CODES.BAD_REQUEST);
    }

    const User = require('../models/user.model');
    const OtpVerification = require('../models/otp-verification.model');

    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user) {
      return res.sendError(new Error('Invalid'), 'Invalid email or OTP', STATUS_CODES.BAD_REQUEST);
    }

    const otpRecord = await OtpVerification.findOne({
      user_id: user._id,
      purpose: 'PASSWORD_RESET',
      is_used: false,
      otp: String(otp).trim(),
      expires_at: { $gt: Date.now() },
    }).sort({ created_at: -1 });

    if (!otpRecord) {
      return res.sendError(new Error('Invalid'), 'Invalid or expired OTP', STATUS_CODES.BAD_REQUEST);
    }

    user.password_hash = newPassword; // pre-save hook in User model will hash it
    await user.save();

    otpRecord.is_used = true;
    await otpRecord.save();

    // Invalidate all active sessions/tokens (force re-login)
    user.token_version = (user.token_version || 0) + 1;
    await user.save();

    return res.sendSuccess({ message: 'Password reset successful. Please log in.' }, 'Password reset', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.sendError(new Error('Validation error'), 'Current password and new password are required', STATUS_CODES.BAD_REQUEST);
    }
    if (String(newPassword).length < 6) {
      return res.sendError(new Error('Validation error'), 'Password must be at least 6 characters', STATUS_CODES.BAD_REQUEST);
    }
    await authService.changeUserPassword(req.userId, currentPassword, newPassword);
    res.sendSuccess(null, 'Password changed successfully', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

module.exports = {
  register,
  login,
  googleLogin,
  facebookLogin,
  appleLogin,
  logout,
  sendEmailChangeOTP,
  verifyEmailChangeOTP,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword,
};
