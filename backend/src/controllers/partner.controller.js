const partnerService = require('../services/partner.service');
const paymentService = require('../services/payment.service');
const User = require('../models/user.model');
const PartnerProfile = require('../models/partner-profile.model');
const TierHistory = require('../models/tier-history.model');
const { broadcast } = require('../utils/sse');
const STATUS_CODES = require('../utils/statusCodes');

// Q1 fix: tier config and pricing now come from the shared
// config/tier.config.js. TIER_PRICING is kept as a thin shim for
// any callers that still reference it; new code should use the
// config helpers directly.
const { getTierConfig, getTierPrice } = require('../config/tier.config');
const TIER_PRICING = {
  standard: { price: getTierPrice('standard'), label: 'Standard Partner', duration_days: 30 },
  sponsored: { price: getTierPrice('sponsored'), label: 'Sponsored Partner', duration_days: 30 },
  premium: { price: getTierPrice('premium'), label: 'Premium Partner', duration_days: 30 },
};

const getDashboard = async (req, res) => {
  try {
    const dashboard = await partnerService.getPartnerDashboard(req.user.id);
    res.json({ success: true, data: dashboard });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const profile = await partnerService.getPartnerProfile(req.user.id);
    res.json({ success: true, data: profile });
  } catch (error) {
    res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const profile = await partnerService.updatePartnerProfile(req.user.id, req.body);
    res.json({ success: true, data: profile });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

// ============ TIER MANAGEMENT ============

const getTierInfo = async (req, res) => {
  try {
    const tierInfo = await partnerService.getPartnerTierInfo(req.user.id);
    res.json({ success: true, data: tierInfo });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const upgradeTier = async (req, res) => {
  try {
    const { tier } = req.body;
    if (!tier) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'Tier is required' });
    }

    const validTiers = ['standard', 'sponsored', 'premium'];
    if (!validTiers.includes(tier)) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'Invalid tier. Must be: standard, sponsored, or premium' });
    }

    const result = await partnerService.upgradePartnerTier(req.user.id, tier);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const degradeTier = async (req, res) => {
  try {
    const result = await partnerService.degradePartnerTier(req.user.id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

// ============ TIER PURCHASE (Cashfree Payment) ============

const purchaseTier = async (req, res) => {
  try {
    const { tier } = req.body;
    const userId = req.user._id || req.user.id;

    if (!tier || !TIER_PRICING[tier]) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'Invalid tier' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: 'User not found' });
    }

    const tierConfig = TIER_PRICING[tier];

    // Create Cashfree order
    const userPhone = user.phone || '9999999999';
    const userEmail = user.email || 'user@example.com';

    const orderData = await paymentService.createOrder(
      userId.toString(),
      tierConfig.price,
      userPhone,
      userEmail
    );

    // Store order info on user for verification
    // We store the tier in a metadata field so verifyTierPurchase knows which tier
    await User.findByIdAndUpdate(userId, {
      pass_order_id: orderData.order_id,
      pass_type: `${tier}_partner`, // e.g. standard_partner
    });

    res.json({
      success: true,
      data: {
        order_id: orderData.order_id,
        payment_session_id: orderData.payment_session_id,
        amount: tierConfig.price,
        tier_details: {
          tier,
          label: tierConfig.label,
          duration_days: tierConfig.duration_days,
        }
      }
    });
  } catch (error) {
    console.error('purchaseTier error:', error);
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const verifyTierPurchase = async (req, res) => {
  try {
    const { order_id, tier } = req.body;
    const userId = req.user._id || req.user.id;

    if (!order_id || !tier) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'order_id and tier are required' });
    }
    if (!TIER_PRICING[tier]) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'Invalid tier' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: 'User not found' });
    }

    if (user.pass_order_id !== order_id) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'Invalid order ID' });
    }

    // Cross-check: the tier submitted must match the tier that was paid for
    if (user.pass_type !== `${tier}_partner`) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: `Tier mismatch: order was created for ${user.pass_type}, not ${tier}`,
      });
    }

    // Verify payment with Cashfree
    const verification = await paymentService.verifyOrder(order_id);
    if (!verification.success) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'Payment not completed' });
    }

    // Also verify the payment amount matches the tier price (defense in depth)
    const expectedAmount = TIER_PRICING[tier].price;
    const paidAmount = verification.amount || 0;
    if (Number(paidAmount) < Number(expectedAmount)) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: `Insufficient payment: expected ${expectedAmount}, got ${paidAmount}`,
      });
    }

    const tierConfig = getTierConfig(tier);
    const tierPricing = TIER_PRICING[tier];
    const now = new Date();
    const expiryDate = new Date(now.getTime() + (tierPricing.duration_days * 24 * 60 * 60 * 1000));

    // If user is NOT yet a partner, upgrade their role
    let isNewPartner = false;
    if (user.role !== 'PARTNER' && user.role !== 'ADMIN') {
      await User.findByIdAndUpdate(userId, {
        role: 'PARTNER',
        is_verified: true,
        verification_source: 'PREMIUM',
      });
      isNewPartner = true;
    }

    // Create or update partner profile with tier
    await PartnerProfile.findOneAndUpdate(
      { user_id: userId },
      {
        $set: {
          partner_tier: tier,
          tier_label: tierConfig.label,
          commission_rate: tierConfig.commission_rate,
          tier_upgraded_at: now,
          tier_expiry: expiryDate,
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

    // Clear order ID
    await User.findByIdAndUpdate(userId, { pass_order_id: null });

    // Record tier history
    console.log('[TIER HISTORY] Creating', isNewPartner ? 'ACTIVATED' : 'PURCHASE', 'record for user:', userId, 'tier:', tier);
    await TierHistory.create({
      user_id: userId,
      partner_tier: tier,
      action: isNewPartner ? 'ACTIVATED' : 'PURCHASE',
      order_id,
      amount: tierPricing.price,
      label: tierConfig.label,
    });
    console.log('[TIER HISTORY] Record created successfully');

    // Broadcast partner activation if new
    if (isNewPartner) {
      broadcast({
        type: 'PARTNER_ACTIVATED',
        userId: userId.toString(),
        tier,
      });
    }

    res.json({
      success: true,
      message: isNewPartner
        ? `Welcome! You are now a ${tierConfig.label}!`
        : `Tier upgraded to ${tierConfig.label} successfully!`,
      data: {
        tier,
        label: tierConfig.label,
        commission_rate: tierConfig.commission_rate,
        tier_expiry: expiryDate,
        is_new_partner: isNewPartner,
        order_id,
      }
    });
  } catch (error) {
    console.error('verifyTierPurchase error:', error);
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

// ============ COMMISSION ============

const getCommissionHistory = async (req, res) => {
  try {
    const commissionData = await partnerService.getCommissionHistory(req.user.id);
    res.json({ success: true, data: commissionData });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const calculateCommission = async (req, res) => {
  try {
    const { matchId } = req.params;
    const result = await partnerService.calculateEventCommission(matchId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

// ============ TIER HISTORY ============

const getTierHistory = async (req, res) => {
  try {
    const history = await partnerService.getTierHistory(req.user.id);
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

// ============ EVENT MANAGEMENT ============

const createEvent = async (req, res) => {
  try {
    const event = await partnerService.createPartnerEvent(req.user.id, req.body);
    res.status(STATUS_CODES.CREATED).json({ success: true, data: event });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const getEvents = async (req, res) => {
  try {
    const { status, event_type, isPublished, event_category } = req.query;
    const filters = {};
    if (status) filters.status = status;
    if (event_type) filters.event_type = event_type;
    if (isPublished !== undefined) filters.isPublished = isPublished === 'true';
    if (event_category) filters.event_category = event_category;

    const events = await partnerService.getPartnerEvents(req.user.id, filters);
    res.json({ success: true, data: events });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const getEvent = async (req, res) => {
  try {
    const event = await partnerService.getPartnerEvent(req.user.id, req.params.id);
    res.json({ success: true, data: event });
  } catch (error) {
    res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: error.message });
  }
};

const updateEvent = async (req, res) => {
  try {
    const event = await partnerService.updatePartnerEvent(req.user.id, req.params.id, req.body);
    res.json({ success: true, data: event });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const deleteEvent = async (req, res) => {
  try {
    await partnerService.deletePartnerEvent(req.user.id, req.params.id);
    res.json({ success: true, message: 'Event deleted' });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const publishEvent = async (req, res) => {
  try {
    const event = await partnerService.publishPartnerEvent(req.user.id, req.params.id);
    res.json({ success: true, data: event });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const updateRoomDetails = async (req, res) => {
  try {
    const { room_id, room_password } = req.body;
    const event = await partnerService.updateRoomDetails(req.user.id, req.params.id, {
      room_id,
      room_password,
    });
    res.json({ success: true, data: event });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const getParticipants = async (req, res) => {
  try {
    const participants = await partnerService.getEventParticipants(req.user.id, req.params.id);
    res.json({ success: true, data: participants });
  } catch (error) {
    res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: error.message });
  }
};

const getMyQrCode = async (req, res) => {
  try {
    const subscriptionService = require('../services/partner-subscription.service');
    const result = await subscriptionService.generatePartnerQr(req.user.id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const regenerateMyQrCode = async (req, res) => {
  try {
    const subscriptionService = require('../services/partner-subscription.service');
    const result = await subscriptionService.regeneratePartnerQr(req.user.id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

module.exports = {
  getDashboard,
  getProfile,
  updateProfile,
  getTierInfo,
  upgradeTier,
  degradeTier,
  purchaseTier,
  verifyTierPurchase,
  getTierHistory,
  getCommissionHistory,
  createEvent,
  getEvents,
  getEvent,
  updateEvent,
  deleteEvent,
  publishEvent,
  updateRoomDetails,
  getParticipants,
  getMyQrCode,
  regenerateMyQrCode,
};
