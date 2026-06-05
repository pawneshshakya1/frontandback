const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
  },
  body: {
    type: String,
    required: true,
  },
  data: {
    type: Object,
    default: {},
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  type: {
    type: String,
    enum: ['SYSTEM', 'ANNOUNCEMENT', 'MATCH_UPDATE', 'FRIEND_REQUEST', 'FRIEND_EVENT', 'PAYMENT', 'WALLET', 'PASS', 'PARTNER_EVENT', 'SECURITY', 'SECURITY_ALERT', 'REWARD', 'PROMOTION'],
    default: 'SYSTEM',
  },
  sender_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
});

NotificationSchema.index({ user_id: 1, createdAt: -1 });
NotificationSchema.index({ isRead: 1 });
NotificationSchema.index({ type: 1 });

module.exports = mongoose.model('Notification', NotificationSchema);
