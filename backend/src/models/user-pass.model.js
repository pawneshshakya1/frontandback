const mongoose = require('mongoose');

const UserPassSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  pass_type: {
    type: String,
    required: true,
    enum: ['pro', 'elite', 'supreme'],
  },
  status: {
    type: String,
    required: true,
    enum: ['ACTIVE', 'EXPIRED', 'CANCELLED'],
    default: 'ACTIVE',
  },
  activated_at: { type: Date, default: Date.now },
  expires_at: { type: Date, required: true },
  order_id: { type: String, sparse: true },
  auto_renew: { type: Boolean, default: false },
  daily_events_used: { type: Number, default: 0 },
  last_daily_reset: { type: Date, default: Date.now },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

UserPassSchema.index({ user_id: 1, status: 1 });
UserPassSchema.index({ expires_at: 1 });
UserPassSchema.index({ pass_type: 1 });

module.exports = mongoose.model('UserPass', UserPassSchema);
