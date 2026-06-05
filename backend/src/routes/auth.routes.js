const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

const { protect } = require('../middlewares/auth.middleware');
const { authLimiter } = require('../middlewares/rateLimit.middleware');

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);
router.post('/logout', protect, authController.logout);
router.post('/google', authLimiter, authController.googleLogin);
router.post('/facebook', authLimiter, authController.facebookLogin);
router.post('/apple', authLimiter, authController.appleLogin);
router.post('/send-email-otp', protect, authController.sendEmailChangeOTP);
router.post('/verify-email-otp', protect, authController.verifyEmailChangeOTP);
router.post('/change-password', protect, authController.changePassword);
router.get('/me', protect, authController.getMe);

module.exports = router;
