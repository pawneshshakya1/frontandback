/**
 * Single source of truth for partner tier configuration.
 *
 * Replaces the three duplicate definitions that previously lived in
 *   - models/partner-profile.model.js  (PARTNER_TIERS const + statics)
 *   - controllers/partner.controller.js (TIER_PRICING + getTierConfig)
 *   - controllers/elitePass.controller.js (TIER_PRICING + helpers)
 *   - services/partner.service.js (tierPricing object + upgrade logic)
 *
 * All four call sites now import from here.
 *
 * IMPORTANT: if you change prices, update the matching rows in
 * elitePass.controller.seedDefaultPasses too (or seed from this file).
 */

const PARTNER_TIERS = {
  STANDARD: {
    value: 'standard',
    label: 'Standard Partner',
    commission_rate: 1,
    max_events_per_month: 10,
    max_players_per_event: 50,
    can_create_sponsored: false,
    can_create_premium: false,
    can_create_offline: false,
    max_entry_fee: 100,
    max_prize_pool: 5000,
    daily_event_limit: 3,
    featured_listing: false,
    priority_support: false,
    analytics_access: false,
    max_sponsors_per_event: 0,
    color: '#94a3b8',
    icon: 'shield',
    price: 499,
    duration_days: 30,
  },
  SPONSORED: {
    value: 'sponsored',
    label: 'Sponsored Partner',
    commission_rate: 3,
    max_events_per_month: 30,
    max_players_per_event: 100,
    can_create_sponsored: true,
    can_create_premium: false,
    can_create_offline: true,
    max_entry_fee: 500,
    max_prize_pool: 25000,
    daily_event_limit: 5,
    featured_listing: true,
    priority_support: false,
    analytics_access: true,
    max_sponsors_per_event: 1,
    color: '#3b82f6',
    icon: 'campaign',
    price: 1499,
    duration_days: 30,
  },
  PREMIUM: {
    value: 'premium',
    label: 'Premium Partner',
    commission_rate: 5,
    max_events_per_month: -1, // unlimited
    max_players_per_event: 200,
    can_create_sponsored: true,
    can_create_premium: true,
    can_create_offline: true,
    max_entry_fee: 1000,
    max_prize_pool: 100000,
    daily_event_limit: 10,
    featured_listing: true,
    priority_support: true,
    analytics_access: true,
    max_sponsors_per_event: 3,
    color: '#fbbf24',
    icon: 'workspace-premium',
    price: 4999,
    duration_days: 30,
  },
};

const getTierConfig = (tier) => {
  if (!tier) return PARTNER_TIERS.STANDARD;
  const key = String(tier).toUpperCase();
  return PARTNER_TIERS[key] || PARTNER_TIERS.STANDARD;
};

const getAllTiers = () => PARTNER_TIERS;

const getTierPrice = (tier) => {
  const cfg = getTierConfig(tier);
  return cfg ? cfg.price : 0;
};

const getTierByValue = (value) => {
  const key = String(value || '').toUpperCase();
  return PARTNER_TIERS[key] || null;
};

module.exports = {
  PARTNER_TIERS,
  getTierConfig,
  getAllTiers,
  getTierPrice,
  getTierByValue,
};
