const mongoose = require('mongoose');

const elitePassSchema = new mongoose.Schema({
  pass_type: {
    type: String,
    required: true,
    unique: true,
    enum: ['pro', 'elite', 'supreme', 'standard_partner', 'sponsored_partner', 'premium_partner']
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  price: {
    type: Number,
    required: true
  },
  duration_days: {
    type: Number,
    required: true
  },
  // For USER passes: total events the user can host while the pass is active.
  // For PARTNER passes: unused (their tier system has separate limits).
  event_count: {
    type: Number,
    default: null,
  },
  // Kept for backward-compat with old user passes; user passes use event_count now.
  winnings_boost: {
    type: Number,
    required: true,
    default: 0,
  },
  features: [{
    type: String
  }],
  color: {
    type: String,
    required: true
  },
  is_active: {
    type: Boolean,
    default: true
  },
  is_popular: {
    type: Boolean,
    default: false
  },
  benefits: [{
    title: String,
    description: String,
    icon: String
  }],
  // ============ PARTNER PASS FIELDS ============
  pass_category: {
    type: String,
    enum: ['user', 'partner'],
    default: 'user',
  },
  partner_tier: {
    type: String,
    enum: ['standard', 'sponsored', 'premium', null],
    default: null,
  },
}, {
  timestamps: true
});

// Index for querying by category
elitePassSchema.index({ pass_category: 1 });
elitePassSchema.index({ is_active: 1, pass_category: 1 });

module.exports = mongoose.model('ElitePass', elitePassSchema);
