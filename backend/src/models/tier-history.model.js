const mongoose = require('mongoose');

const tierHistorySchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  partner_tier: {
    type: String,
    enum: ['standard', 'sponsored', 'premium'],
    required: true,
  },
  action: {
    type: String,
    enum: ['PURCHASE', 'UPGRADE', 'DOWNGRADE', 'ACTIVATED', 'EXPIRED'],
    required: true,
  },
  order_id: {
    type: String,
    default: null,
  },
  amount: {
    type: Number,
    default: 0,
  },
  label: {
    type: String,
    default: '',
  },
  previous_tier: {
    type: String,
    enum: ['standard', 'sponsored', 'premium', null],
    default: null,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

tierHistorySchema.index({ user_id: 1, created_at: -1 });

module.exports = mongoose.model('TierHistory', tierHistorySchema);
