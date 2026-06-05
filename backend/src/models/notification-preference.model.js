const mongoose = require('mongoose');

const NotificationPreferenceSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },

  // ============ CHANNEL SETTINGS ============
  push_enabled: { type: Boolean, default: true },
  email_enabled: { type: Boolean, default: false },
  in_app_enabled: { type: Boolean, default: true },

  // ============ ACTIVITY TYPES ============
  // Tournament / Match notifications
  tournament_updates: { type: Boolean, default: true },   // match created, joined, started, results
  tournament_email: { type: Boolean, default: false },

  // Payment & Wallet notifications
  payment_updates: { type: Boolean, default: true },       // payment success, failed, refund
  wallet_updates: { type: Boolean, default: true },        // deposit, withdraw, prize won
  payment_email: { type: Boolean, default: true },         // email for payments by default

  // Rewards & Promotions
  rewards_promotions: { type: Boolean, default: true },    // bonuses, offers, elite pass promos
  rewards_email: { type: Boolean, default: false },

  // Security Alerts (always enabled, cannot be disabled)
  security_alerts: { type: Boolean, default: true },       // new login, password change, 2FA
  security_email: { type: Boolean, default: true },        // email for security by default

  // Friend activity
  friend_activity: { type: Boolean, default: true },       // friend requests, accepted
  friend_email: { type: Boolean, default: false },

  // Partner event notifications
  partner_events: { type: Boolean, default: true },        // new events from subscribed partners
  partner_email: { type: Boolean, default: false },

  // System announcements
  system_announcements: { type: Boolean, default: true },  // app updates, maintenance
  system_email: { type: Boolean, default: false },

  // Elite Pass
  pass_updates: { type: Boolean, default: true },          // pass expiry, renewal
  pass_email: { type: Boolean, default: false },

}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

// Static: Get or create default preferences
NotificationPreferenceSchema.statics.getOrCreate = async function(userId) {
  let prefs = await this.findOne({ user_id: userId });
  if (!prefs) {
    prefs = await this.create({ user_id: userId });
  }
  return prefs;
};

// Instance: Check if a notification type is enabled for a channel
NotificationPreferenceSchema.methods.isEnabled = function(type, channel = 'push') {
  // Security alerts are always enabled
  if (type === 'SECURITY' || type === 'SECURITY_ALERT') return true;

  const channelKey = channel === 'push' ? 'push_enabled' : channel === 'email' ? 'email_enabled' : 'in_app_enabled';
  if (!this[channelKey]) return false;

  // Map notification types to preference keys
  const typeMap = {
    'MATCH_UPDATE': 'tournament_updates',
    'PARTNER_EVENT': 'partner_events',
    'PAYMENT': 'payment_updates',
    'WALLET': 'wallet_updates',
    'FRIEND_REQUEST': 'friend_activity',
    'FRIEND_EVENT': 'friend_activity',
    'PASS': 'pass_updates',
    'SYSTEM': 'system_announcements',
    'ANNOUNCEMENT': 'system_announcements',
    'SECURITY': 'security_alerts',
    'SECURITY_ALERT': 'security_alerts',
    'REWARD': 'rewards_promotions',
    'PROMOTION': 'rewards_promotions',
  };

  const prefKey = typeMap[type];
  if (!prefKey) return true; // unknown type, default to enabled

  if (channel === 'email') {
    const emailKey = prefKey.replace('_updates', '_email').replace('_activity', '_email').replace('_announcements', '_email');
    return this[emailKey] !== undefined ? this[emailKey] : this[prefKey];
  }

  return this[prefKey] !== undefined ? this[prefKey] : true;
};

module.exports = mongoose.model('NotificationPreference', NotificationPreferenceSchema);
