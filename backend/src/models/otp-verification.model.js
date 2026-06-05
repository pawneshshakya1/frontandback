const mongoose = require('mongoose');

const OtpVerificationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  otp: { type: String, required: true },
  purpose: {
    type: String,
    required: true,
    enum: ['PIN_RESET', 'EMAIL_CHANGE', 'PHONE_VERIFY', 'FRIEND_REQUEST', 'PASSWORD_RESET'],
  },
  expires_at: { type: Date, required: true },
  is_used: { type: Boolean, default: false },
  ip_address: { type: String, default: null },
  user_agent: { type: String, default: null },
}, {
  timestamps: { createdAt: 'created_at' },
});

OtpVerificationSchema.index({ user_id: 1, purpose: 1, is_used: 1 });
OtpVerificationSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OtpVerification', OtpVerificationSchema);
