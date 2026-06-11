const mongoose = require('mongoose');
const { PARTNER_TIERS, getTierConfig, getAllTiers } = require('../config/tier.config');

// Q1 fix: PARTNER_TIERS, getTierConfig, getAllTiers are now defined
// in config/tier.config.js (the single source of truth) and re-used
// by partner.service.js, partner.controller.js, elitePass.controller.js.

const PartnerProfileSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  business_name: {
    type: String,
    trim: true,
    default: null,
  },
  phone: {
    type: String,
    trim: true,
    default: null,
  },
  address: {
    type: String,
    trim: true,
    default: null,
  },
  city: {
    type: String,
    trim: true,
    default: null,
  },
  state: {
    type: String,
    trim: true,
    default: null,
  },
  pincode: {
    type: String,
    trim: true,
    default: null,
  },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },
  },
  is_verified: {
    type: Boolean,
    default: false,
  },
  total_events_created: {
    type: Number,
    default: 0,
  },
  total_revenue: {
    type: Number,
    default: 0,
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },

  // ============ PARTNER TIER SYSTEM ============
  partner_tier: {
    type: String,
    enum: ['standard', 'sponsored', 'premium'],
    default: 'standard',
  },
  tier_label: {
    type: String,
    default: 'Standard Partner',
  },
  tier_upgraded_at: {
    type: Date,
    default: null,
  },
  tier_expiry: {
    type: Date,
    default: null, // null = lifetime tier from pass
  },
  tier_pass_order_id: {
    type: String,
    default: null, // Cashfree order ID for tier purchase
  },

  // ============ COMMISSION TRACKING ============
  commission_rate: {
    type: Number,
    default: 1, // 1-5% based on tier
    min: 0,
    max: 10,
  },
  total_commission_paid: {
    type: Number,
    default: 0,
  },
  total_commission_pending: {
    type: Number,
    default: 0,
  },

  // ============ MONTHLY EVENT LIMITS ============
  events_this_month: {
    type: Number,
    default: 0,
  },
  month_reset_date: {
    type: Date,
    default: Date.now,
  },

  // ============ TIER BENEFITS ============
  daily_event_limit: {
    type: Number,
    default: 3, // events per day
  },
  max_sponsors_per_event: {
    type: Number,
    default: 0,
  },
  featured_listing: {
    type: Boolean,
    default: false,
  },
  priority_support: {
    type: Boolean,
    default: false,
  },
  analytics_access: {
    type: Boolean,
    default: false,
  },

  // ============ QR CODE FOR SUBSCRIBE-BY-SCAN ============
  qr_token: {
    type: String,
    unique: true,
    sparse: true,
  },
  qr_generated_at: {
    type: Date,
    default: null,
  },

  // ============ DENORMALIZED COUNTERS ============
  subscription_count: {
    type: Number,
    default: 0,
  },
  active_subscribers: {
    type: Number,
    default: 0,
  },
  total_live_events: {
    type: Number,
    default: 0,
  },

  // ============ DISPLAY INFO ============
  bio: {
    type: String,
    default: null,
    maxlength: 500,
  },
  logo_url: {
    type: String,
    default: null,
  },
  banner_url: {
    type: String,
    default: null,
  },
  is_subscribable: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

// Indexes
PartnerProfileSchema.index({ is_verified: 1 });
PartnerProfileSchema.index({ city: 1, state: 1 });
PartnerProfileSchema.index({ location: '2dsphere' });
PartnerProfileSchema.index({ partner_tier: 1 });
PartnerProfileSchema.index({ subscription_count: -1 });
PartnerProfileSchema.index({ is_subscribable: 1 });

// Static methods delegate to the shared config (Q1).
PartnerProfileSchema.statics.getTierConfig = function(tier) {
  return getTierConfig(tier);
};
PartnerProfileSchema.statics.getAllTiers = function() {
  return getAllTiers();
};

// Instance method to check if partner can create event type
PartnerProfileSchema.methods.canCreateEventType = function(eventType) {
  const tierConfig = getTierConfig(this.partner_tier);
  const type = (eventType || '').toLowerCase();
  switch (type) {
    case 'sponsored':
      return tierConfig.can_create_sponsored;
    case 'premium':
      return tierConfig.can_create_premium;
    case 'standard':
      return true;
    default:
      return true;
  }
};

// Instance method to check monthly event limit
PartnerProfileSchema.methods.canCreateMoreEvents = function() {
  const tierConfig = getTierConfig(this.partner_tier);
  if (tierConfig.max_events_per_month === -1) return true; // unlimited
  return this.events_this_month < tierConfig.max_events_per_month;
};

// Instance method to check entry fee limit
PartnerProfileSchema.methods.isEntryFeeAllowed = function(entryFee) {
  const tierConfig = getTierConfig(this.partner_tier);
  return entryFee <= tierConfig.max_entry_fee;
};

// Instance method to check prize pool limit
PartnerProfileSchema.methods.isPrizePoolAllowed = function(prizePool) {
  const tierConfig = getTierConfig(this.partner_tier);
  return prizePool <= tierConfig.max_prize_pool;
};

// Instance method to reset monthly counter if needed
PartnerProfileSchema.methods.checkAndResetMonthlyCounter = function() {
  const now = new Date();
  const lastReset = new Date(this.month_reset_date);
  const currentMonthYear = `${now.getFullYear()}-${now.getMonth()}`;
  const lastResetMonthYear = `${lastReset.getFullYear()}-${lastReset.getMonth()}`;

  if (currentMonthYear !== lastResetMonthYear) {
    this.events_this_month = 0;
    this.month_reset_date = now;
    return true;
  }
  return false;
};

const PartnerProfile = mongoose.model('PartnerProfile', PartnerProfileSchema);

module.exports = PartnerProfile;
module.exports.PARTNER_TIERS = PARTNER_TIERS; // back-compat shim for older imports
