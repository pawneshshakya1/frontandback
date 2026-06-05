const mongoose = require('mongoose');

const UserSpendAnalyticsSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  total_spent_on_events: { type: Number, default: 0 },
  total_spent_on_passes: { type: Number, default: 0 },
  total_deposited: { type: Number, default: 0 },
  total_withdrawn: { type: Number, default: 0 },
  total_prize_won: { type: Number, default: 0 },
  total_gifts_sent: { type: Number, default: 0 },
  total_gifts_received: { type: Number, default: 0 },
  net_balance: { type: Number, default: 0 },
  events_joined: { type: Number, default: 0 },
  events_created: { type: Number, default: 0 },
  passes_purchased: { type: Number, default: 0 },
  last_transaction_at: { type: Date, default: null },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

UserSpendAnalyticsSchema.index({ total_spent_on_events: -1 });
UserSpendAnalyticsSchema.index({ net_balance: -1 });
UserSpendAnalyticsSchema.index({ last_transaction_at: -1 });

module.exports = mongoose.model('UserSpendAnalytics', UserSpendAnalyticsSchema);
