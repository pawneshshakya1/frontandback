const ElitePass = require('../models/elitePass.model');
const User = require('../models/user.model');
const PartnerProfile = require('../models/partner-profile.model');
const paymentService = require('../services/payment.service');
const Wallet = require('../models/wallet.model');
const spendAnalyticsService = require('../services/user-spend-analytics.service');
const { broadcast } = require('../utils/sse');
// Q1 fix: import tier config + price from the shared module so the
// local getTierConfig and hard-coded partner pass prices below stay
// in sync with the single source of truth.
const { getTierConfig, getTierPrice } = require('../config/tier.config');

// ============ ADMIN ROUTES ============

// Admin: Get all elite passes
const getAllPasses = async (req, res) => {
  try {
    const passes = await ElitePass.find({ is_active: true }).sort({ price: 1 });
    res.json({ success: true, data: passes });
  } catch (error) {
    console.error('getAllPasses error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch passes' });
  }
};

// Admin: Get all passes (including inactive)
const getAllPassesAdmin = async (req, res) => {
  try {
    const passes = await ElitePass.find().sort({ price: 1 });
    res.json({ success: true, data: passes });
  } catch (error) {
    console.error('getAllPassesAdmin error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch passes' });
  }
};

// Normalize any incoming value into a clean array of non-empty strings.
// Mongoose's [String] cast chokes on values that look like an object
// (e.g. an array that was spread into {0:...,1:...} by the client) or
// on JSON-stringified strings. This helper handles every shape we've
// seen from the admin form and the seeded data.
const toStringArray = (v) => {
  if (Array.isArray(v)) {
    return v
      .filter((x) => x !== null && x !== undefined)
      .map((x) => {
        if (typeof x === 'string') return x.trim();
        if (typeof x === 'number' || typeof x === 'boolean') return String(x);
        if (typeof x === 'object') {
          // Spread-array artefact: { '0': 'a', '1': 'b' } → ['a', 'b']
          const keys = Object.keys(x).filter((k) => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b));
          if (keys.length) return keys.map((k) => String(x[k])).join(', ');
          // Real benefit object: { title, description, icon }
          if (x.title || x.description) return x.title || x.description;
        }
        return String(x);
      })
      .filter(Boolean);
  }
  if (v && typeof v === 'object') {
    return toStringArray([v]);
  }
  if (typeof v === 'string') {
    // Try to recover from a JSON-stringified array
    const trimmed = v.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return toStringArray(parsed);
      } catch (_) { /* fall through */ }
    }
    return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
};

// Normalize `benefits` into the schema's [{ title, description, icon }]
// shape. Accepts either real benefit objects (preferred) or plain
// strings (converted to { title, icon }).
const toBenefitObjects = (v) => {
  const arr = toStringArray(v);
  return arr.map((s) => ({ title: s, description: s, icon: 'star' }));
};

// Admin: Create or update a pass (upsert by pass_type).
// The admin form's tier dropdown is restricted to the known tier names
// (pro/elite/supreme for user passes, standard/sponsored/premium for
// partner passes), all of which collide with the seeded defaults. To
// match the seedDefaultPasses behaviour and let admins re-configure
// an existing pass tier, this endpoint upserts on pass_type instead
// of returning 400 "Pass type already exists".
const createPass = async (req, res) => {
  try {
    const { pass_type, name, description, price, duration_days, winnings_boost, event_count, features, color, is_popular, benefits, pass_category } = req.body;

    if (!pass_type) {
      return res.status(400).json({ success: false, message: 'pass_type is required' });
    }

    const cleanFeatures = toStringArray(features);
    const cleanBenefits = toBenefitObjects(benefits);

    const existingPass = await ElitePass.findOne({ pass_type });
    const wasUpdate = Boolean(existingPass);

    const pass = await ElitePass.findOneAndUpdate(
      { pass_type },
      {
        $set: {
          pass_type,
          name,
          description,
          price,
          duration_days,
          winnings_boost: winnings_boost || 0,
          event_count: event_count != null ? event_count : null,
          features: cleanFeatures,
          color,
          is_popular: is_popular || false,
          benefits: cleanBenefits,
          pass_category: pass_category || 'user', // 'user' or 'partner'
        },
        $setOnInsert: { created_at: new Date() },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );

    res.status(wasUpdate ? 200 : 201).json({
      success: true,
      data: pass,
      message: wasUpdate ? 'Pass updated' : 'Pass created',
    });
  } catch (error) {
    console.error('createPass error:', error);
    res.status(500).json({ success: false, message: 'Failed to create pass', detail: error.message });
  }
};

// Admin: Update pass
const updatePass = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const pass = await ElitePass.findByIdAndUpdate(id, updates, { new: true });
    if (!pass) {
      return res.status(404).json({ success: false, message: 'Pass not found' });
    }

    res.json({ success: true, data: pass });
  } catch (error) {
    console.error('updatePass error:', error);
    res.status(500).json({ success: false, message: 'Failed to update pass' });
  }
};

// Admin: Delete pass (soft delete by setting is_active to false)
const deletePass = async (req, res) => {
  try {
    const { id } = req.params;

    const pass = await ElitePass.findByIdAndUpdate(id, { is_active: false }, { new: true });
    if (!pass) {
      return res.status(404).json({ success: false, message: 'Pass not found' });
    }

    res.json({ success: true, message: 'Pass deleted successfully' });
  } catch (error) {
    console.error('deletePass error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete pass' });
  }
};

// ============ USER ROUTES ============

// User: Get active passes (user passes only)
const getActivePasses = async (req, res) => {
  try {
    const passes = await ElitePass.find({ is_active: true, pass_category: 'user' }).sort({ price: 1 });
    res.json({ success: true, data: passes });
  } catch (error) {
    console.error('getActivePasses error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch passes' });
  }
};

// User: Get active partner passes (for "Become a Partner" section)
const getPartnerPasses = async (req, res) => {
  try {
    const passes = await ElitePass.find({ is_active: true, pass_category: 'partner' }).sort({ price: 1 });
    res.json({ success: true, data: passes });
  } catch (error) {
    console.error('getPartnerPasses error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch partner passes' });
  }
};

// User: Get current user's pass status
const getUserPassStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('pass_type pass_expiry pass_activated_at role');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let passDetails = null;
    if (user.pass_type && user.pass_type !== 'none') {
      passDetails = await ElitePass.findOne({ pass_type: user.pass_type });
    }

    // Check if user is also a partner
    let partnerProfile = null;
    if (user.role === 'PARTNER') {
      partnerProfile = await PartnerProfile.findOne({ user_id: user._id });
    }

    res.json({
      success: true,
      data: {
        pass_type: user.pass_type,
        pass_expiry: user.pass_expiry,
        pass_activated_at: user.pass_activated_at,
        pass_details: passDetails,
        has_active_pass: user.pass_expiry && new Date(user.pass_expiry) > new Date(),
        role: user.role,
        is_partner: user.role === 'PARTNER',
        partner_tier: partnerProfile?.partner_tier || null,
      }
    });
  } catch (error) {
    console.error('getUserPassStatus error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch pass status' });
  }
};

// User: Initiate pass purchase (regular user pass OR partner pass)
const initiatePurchase = async (req, res) => {
  try {
    const { pass_type, become_partner } = req.body;
    const userId = req.user._id;

    const pass = await ElitePass.findOne({ pass_type, is_active: true });
    if (!pass) {
      return res.status(404).json({ success: false, message: 'Pass not found or not available' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // If this is a partner pass, check if user is already a partner
    if (pass.pass_category === 'partner' || become_partner) {
      if (user.role === 'PARTNER') {
        // Partner is buying an upgrade - allowed
      } else {
        // Regular user becoming partner - allowed
      }
    }

    // Create payment order via Cashfree
    console.log('Creating Cashfree order for pass:', pass.name, 'price:', pass.price);
    const userPhone = user.phone || user.phone_number || '9999999999';
    const userEmail = user.email || 'user@example.com';

    const orderData = await paymentService.createOrder(
      userId.toString(),
      pass.price,
      userPhone,
      userEmail
    );
    console.log('Cashfree order response:', JSON.stringify(orderData));

    // Store order ID in user for later verification
    await User.findByIdAndUpdate(userId, {
      pass_order_id: orderData.order_id,
      pass_type: pass_type, // Temporarily store the requested pass type
    });

    res.json({
      success: true,
      data: {
        order_id: orderData.order_id,
        payment_session_id: orderData.payment_session_id,
        amount: pass.price,
        pass_details: {
          name: pass.name,
          pass_type: pass.pass_type,
          pass_category: pass.pass_category,
          duration_days: pass.duration_days,
          winnings_boost: pass.winnings_boost,
          event_count: pass.event_count,
          partner_tier: pass.partner_tier || null,
        }
      }
    });
  } catch (error) {
    console.error('initiatePurchase error:', error);
    res.status(500).json({ success: false, message: 'Failed to initiate purchase' });
  }
};

// User: Verify payment and activate pass (works for both user and partner passes)
const verifyPurchase = async (req, res) => {
  try {
    const { order_id } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.pass_order_id !== order_id) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }

    // Verify payment with Cashfree
    const verification = await paymentService.verifyOrder(order_id);

    if (!verification.success) {
      return res.status(400).json({ success: false, message: 'Payment not completed' });
    }

    // Get pass details to calculate expiry
    const pass = await ElitePass.findOne({ pass_type: user.pass_type });
    if (!pass) {
      return res.status(404).json({ success: false, message: 'Pass not found' });
    }

    // Calculate expiry date
    const now = new Date();
    const expiryDate = new Date(now.getTime() + (pass.duration_days * 24 * 60 * 60 * 1000));

    // If user already has a pass, extend from that expiry or from now
    let newExpiryDate;
    if (user.pass_expiry && new Date(user.pass_expiry) > now) {
      newExpiryDate = new Date(new Date(user.pass_expiry).getTime() + (pass.duration_days * 24 * 60 * 60 * 1000));
    } else {
      newExpiryDate = expiryDate;
    }

    // Update user with active pass
    const updateData = {
      pass_type: user.pass_type,
      pass_expiry: newExpiryDate,
      pass_activated_at: now,
      pass_order_id: null, // Clear order ID after successful activation
      pass_event_count: pass.event_count || null, // total events allowed (user passes only)
      pass_events_used: 0, // reset on new activation
    };

    // ============ PARTNER PASS AUTO-ACTIVATION ============
    let partnerActivated = false;
    let partnerTier = null;

    if (pass.pass_category === 'partner') {
      // This is a partner pass - auto-activate partner role
      partnerTier = pass.partner_tier || 'standard';

      // Upgrade user role to PARTNER if not already
      if (user.role !== 'PARTNER' && user.role !== 'ADMIN') {
        updateData.role = 'PARTNER';
        updateData.is_verified = true;
        updateData.verification_source = 'PREMIUM';
        partnerActivated = true;
      }

      // Create or update partner profile with tier
      const tierConfig = getTierConfig(partnerTier);

      await PartnerProfile.findOneAndUpdate(
        { user_id: userId },
        {
          $set: {
            partner_tier: partnerTier,
            tier_label: tierConfig.label,
            commission_rate: tierConfig.commission_rate,
            tier_upgraded_at: now,
            tier_expiry: newExpiryDate,
            tier_pass_order_id: order_id,
            daily_event_limit: tierConfig.daily_event_limit,
            featured_listing: tierConfig.featured_listing,
            priority_support: tierConfig.priority_support,
            analytics_access: tierConfig.analytics_access,
            max_sponsors_per_event: tierConfig.max_sponsors_per_event,
          },
          $setOnInsert: {
            user_id: userId,
            business_name: user.username,
            location: { type: 'Point', coordinates: [0, 0] },
          }
        },
        { upsert: true, new: true }
      );

      console.log(`Partner pass activated: User ${userId} is now ${partnerTier} partner`);
    }

    await User.findByIdAndUpdate(userId, updateData);

    await spendAnalyticsService.updateOnPassPurchase(userId, pass.price);

    // Broadcast partner activation if applicable
    if (partnerActivated) {
      broadcast({
        type: 'PARTNER_ACTIVATED',
        userId: userId.toString(),
        tier: partnerTier,
      });
    }

    res.json({
      success: true,
      message: partnerActivated
        ? `Pass activated! You are now a ${partnerTier} partner!`
        : 'Pass activated successfully',
      data: {
        pass_type: user.pass_type,
        pass_expiry: newExpiryDate,
        pass_activated_at: now,
        duration_days: pass.duration_days,
        winnings_boost: pass.winnings_boost,
        event_count: pass.event_count,
        partner_activated: partnerActivated,
        partner_tier: partnerTier,
      }
    });
  } catch (error) {
    console.error('verifyPurchase error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify purchase' });
  }
};

// User: Cancel purchase (clear order ID)
const cancelPurchase = async (req, res) => {
  try {
    const userId = req.user._id;

    await User.findByIdAndUpdate(userId, {
      pass_order_id: null,
      pass_type: 'none'
    });

    res.json({ success: true, message: 'Purchase cancelled' });
  } catch (error) {
    console.error('cancelPurchase error:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel purchase' });
  }
};

// ============ SEED DATA ============

// Helper: Get tier config (re-exported from config/tier.config).
// Local copy removed in Q1 refactor.

// Admin: Seed default passes (both user and partner)
const seedDefaultPasses = async (req, res) => {
  try {
    const defaultPasses = [
      // ============ USER PASSES (event-based) ============
      {
        pass_type: 'pro',
        name: 'PRO Pass',
        description: 'Host 30 events and play with friends. Best starter pack for active players.',
        price: 49,
        duration_days: 30,
        winnings_boost: 0,
        event_count: 30,
        features: [
          '30 Events Hosting',
          'Play With Friends',
          'Friend-to-Friend Chat',
          'PRO Badge on Profile',
        ],
        color: '#3b82f6',
        is_active: true,
        is_popular: false,
        pass_category: 'user',
        partner_tier: null,
        benefits: [
          { title: '30 Events', description: 'Host up to 30 events in 30 days', icon: 'event' },
          { title: 'Play With Friends', description: 'Create friends-only tournaments', icon: 'group' },
          { title: 'Friend Chat', description: 'Chat with anyone on your friends list', icon: 'chat' },
          { title: 'PRO Badge', description: 'Show off your PRO status', icon: 'military-tech' }
        ]
      },
      {
        pass_type: 'elite',
        name: 'ELITE Pass',
        description: 'Most popular: 70 events, friend chat, and full private tournament support.',
        price: 99,
        duration_days: 30,
        winnings_boost: 0,
        event_count: 70,
        features: [
          '70 Events Hosting',
          'Play With Friends',
          'Friend-to-Friend Chat',
          'Priority Match Access',
          'ELITE Badge on Profile',
        ],
        color: '#f47b25',
        is_active: true,
        is_popular: true,
        pass_category: 'user',
        partner_tier: null,
        benefits: [
          { title: '70 Events', description: 'Host up to 70 events in 30 days', icon: 'event' },
          { title: 'Play With Friends', description: 'Friends-only tournaments', icon: 'group' },
          { title: 'Friend Chat', description: 'Direct chat with all your friends', icon: 'chat' },
          { title: 'Priority Access', description: '24hr early match access', icon: 'schedule' },
          { title: 'ELITE Badge', description: 'Premium Elite status badge', icon: 'workspace-premium' }
        ]
      },
      {
        pass_type: 'supreme',
        name: 'SUPREME Pass',
        description: 'Power user pack: 90 events, full friend chat, all PRO + ELITE perks.',
        price: 149,
        duration_days: 30,
        winnings_boost: 0,
        event_count: 90,
        features: [
          '90 Events Hosting',
          'Play With Friends',
          'Friend-to-Friend Chat',
          'All ELITE Features',
          'SUPREME Badge on Profile',
          'Priority Support',
        ],
        color: '#8b5cf6',
        is_active: true,
        is_popular: false,
        pass_category: 'user',
        partner_tier: null,
        benefits: [
          { title: '90 Events', description: 'Host up to 90 events in 30 days', icon: 'event' },
          { title: 'Play With Friends', description: 'Friends-only tournaments', icon: 'group' },
          { title: 'Friend Chat', description: 'Direct chat with all your friends', icon: 'chat' },
          { title: 'All ELITE Features', description: 'Everything in ELITE included', icon: 'star' },
          { title: 'Priority Support', description: '24/7 priority customer support', icon: 'support-agent' },
          { title: 'SUPREME Badge', description: 'Exclusive Supreme status', icon: 'military-tech' }
        ]
      },

      // ============ PARTNER PASSES ============
      {
        pass_type: 'standard_partner',
        name: 'Standard Partner',
        description: 'Start your journey as a tournament organizer. Host up to 10 events/month.',
        price: getTierPrice('standard'),
        duration_days: 30,
        winnings_boost: 0,
        event_count: null,
        features: [
          '1% Admin Commission',
          'Up to 10 Events/Month',
          'Standard Event Creation',
          'Up to ₹100 Entry Fee',
          'Up to ₹5,000 Prize Pool',
          'Partner Badge',
        ],
        color: '#94a3b8',
        is_active: true,
        is_popular: false,
        pass_category: 'partner',
        partner_tier: 'standard',
        benefits: [
          { title: '1% Commission', description: 'Only 1% admin commission on events', icon: 'percent' },
          { title: '10 Events/Month', description: 'Host up to 10 tournaments monthly', icon: 'event' },
          { title: 'Partner Badge', description: 'Official partner status badge', icon: 'workspace-premium' },
          { title: 'Standard Support', description: 'Standard customer support', icon: 'support-agent' },
        ]
      },
      {
        pass_type: 'sponsored_partner',
        name: 'Sponsored Partner',
        description: 'Level up with sponsored events. Host up to 30 events/month with sponsor support.',
        price: getTierPrice('sponsored'),
        duration_days: 30,
        winnings_boost: 0,
        event_count: null,
        features: [
          '3% Admin Commission',
          'Up to 30 Events/Month',
          'Sponsored & Standard Events',
          'Up to ₹500 Entry Fee',
          'Up to ₹25,000 Prize Pool',
          'Featured Listing',
          'Offline Events',
          'Analytics Access',
        ],
        color: '#3b82f6',
        is_active: true,
        is_popular: true,
        pass_category: 'partner',
        partner_tier: 'sponsored',
        benefits: [
          { title: '3% Commission', description: 'Reduced 3% admin commission', icon: 'percent' },
          { title: '30 Events/Month', description: 'Host up to 30 tournaments monthly', icon: 'event' },
          { title: 'Sponsored Events', description: 'Create events with sponsors', icon: 'campaign' },
          { title: 'Featured Listing', description: 'Events appear in featured section', icon: 'star' },
          { title: 'Analytics', description: 'Access detailed event analytics', icon: 'analytics' },
        ]
      },
      {
        pass_type: 'premium_partner',
        name: 'Premium Partner',
        description: 'The ultimate partner experience. Unlimited events, premium perks, and maximum earnings.',
        price: getTierPrice('premium'),
        duration_days: 30,
        winnings_boost: 0,
        event_count: null,
        features: [
          '5% Admin Commission',
          'Unlimited Events/Month',
          'All Event Types',
          'Up to ₹1,000 Entry Fee',
          'Up to ₹1,00,000 Prize Pool',
          'Premium Partner Badge',
          'Priority Support',
          'Offline Events',
          'Full Analytics',
        ],
        color: '#fbbf24',
        is_active: true,
        is_popular: false,
        pass_category: 'partner',
        partner_tier: 'premium',
        benefits: [
          { title: '5% Commission', description: 'Standard 5% admin commission', icon: 'percent' },
          { title: 'Unlimited Events', description: 'No limit on monthly events', icon: 'event' },
          { title: 'Premium Badge', description: 'Exclusive premium partner badge', icon: 'workspace-premium' },
          { title: 'Priority Support', description: '24/7 priority support', icon: 'support-agent' },
          { title: 'All Features', description: 'Sponsored, Premium, Offline events', icon: 'star' },
          { title: 'Full Analytics', description: 'Complete event & revenue analytics', icon: 'analytics' },
        ]
      },
    ];

    // Upsert passes (update if exists, create if not)
    const results = [];
    for (const passData of defaultPasses) {
      const pass = await ElitePass.findOneAndUpdate(
        { pass_type: passData.pass_type },
        passData,
        { upsert: true, new: true }
      );
      results.push(pass);
    }

    res.json({
      success: true,
      message: 'Default passes seeded successfully',
      data: results
    });
  } catch (error) {
    console.error('seedDefaultPasses error:', error);
    res.status(500).json({ success: false, message: 'Failed to seed passes' });
  }
};

module.exports = {
  getAllPasses,
  getAllPassesAdmin,
  createPass,
  updatePass,
  deletePass,
  getActivePasses,
  getPartnerPasses,
  getUserPassStatus,
  initiatePurchase,
  verifyPurchase,
  cancelPurchase,
  seedDefaultPasses
};
