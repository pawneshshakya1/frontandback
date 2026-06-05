const mongoose = require('mongoose');

const UserSessionSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  is_online: { type: Boolean, default: false },
  last_seen: { type: Date, default: Date.now },
  last_login_at: { type: Date, default: null },
  login_count: { type: Number, default: 0 },
  fcm_tokens: [{ type: String, trim: true }],
  device_info: {
    type: {
      platform: String,
      os_version: String,
      app_version: String,
      device_model: String,
    },
    default: null,
  },
  ip_address: { type: String, default: null },
}, {
  timestamps: { updatedAt: 'updated_at' },
});

UserSessionSchema.index({ is_online: 1 });
UserSessionSchema.index({ last_seen: -1 });

module.exports = mongoose.model('UserSession', UserSessionSchema);
