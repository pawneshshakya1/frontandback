const partnerSubscriptionService = require('../services/partner-subscription.service');
const STATUS_CODES = require('../utils/statusCodes');

const subscribe = async (req, res) => {
  try {
    const { partner_id } = req.body;
    if (!partner_id) {
      return res.sendError(new Error('Partner ID is required'), 'Partner ID is required', STATUS_CODES.BAD_REQUEST);
    }
    const subscription = await partnerSubscriptionService.subscribeToPartner(req.userId, partner_id);
    res.sendSuccess(subscription, 'Successfully subscribed to partner', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const unsubscribe = async (req, res) => {
  try {
    const { partner_id } = req.params;
    const subscription = await partnerSubscriptionService.unsubscribeFromPartner(req.userId, partner_id);
    res.sendSuccess(subscription, 'Successfully unsubscribed from partner', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const pause = async (req, res) => {
  try {
    const { partner_id } = req.params;
    const subscription = await partnerSubscriptionService.pauseSubscription(req.userId, partner_id);
    res.sendSuccess(subscription, 'Subscription paused', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const resume = async (req, res) => {
  try {
    const { partner_id } = req.params;
    const subscription = await partnerSubscriptionService.resumeSubscription(req.userId, partner_id);
    res.sendSuccess(subscription, 'Subscription resumed', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const getMySubscriptions = async (req, res) => {
  try {
    const subscriptions = await partnerSubscriptionService.getUserSubscriptions(req.userId);
    res.sendSuccess(subscriptions, 'Subscriptions retrieved', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const getSubscribers = async (req, res) => {
  try {
    const PartnerProfile = require('../models/partner-profile.model');
    const partnerProfile = await PartnerProfile.findOne({ user_id: req.userId });
    if (!partnerProfile) {
      return res.sendError(new Error('Partner profile not found'), 'Partner profile not found', STATUS_CODES.NOT_FOUND);
    }
    const subscribers = await partnerSubscriptionService.getPartnerSubscribers(partnerProfile._id);
    res.sendSuccess(subscribers, 'Subscribers retrieved', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const updatePreferences = async (req, res) => {
  try {
    const { partner_id } = req.params;
    const { notify_new_events, notify_promotions } = req.body;
    const subscription = await partnerSubscriptionService.updateNotificationPreferences(
      req.userId,
      partner_id,
      { notify_new_events, notify_promotions }
    );
    res.sendSuccess(subscription, 'Notification preferences updated', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const getNearbyPartners = async (req, res) => {
  try {
    const { lat, lng, max_distance, limit } = req.query;
    if (!lat || !lng) {
      return res.sendError(new Error('Latitude and longitude are required'), 'Latitude and longitude are required', STATUS_CODES.BAD_REQUEST);
    }
    const partners = await partnerSubscriptionService.findNearbyPartners(
      lat,
      lng,
      max_distance || 10,
      limit || 20
    );
    res.sendSuccess(partners, 'Nearby partners found', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const getAllPartners = async (req, res) => {
  try {
    const { lat, lng, tier, search, limit } = req.query;
    const partners = await partnerSubscriptionService.getAllPartners({
      latitude: lat,
      longitude: lng,
      tier,
      search,
      limit,
    });
    res.sendSuccess(partners, 'Partners retrieved', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const getPublicPartnerProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { lat, lng } = req.query;
    const partner = await partnerSubscriptionService.getPublicPartnerProfile(
      id,
      req.userId,
      lat ? parseFloat(lat) : null,
      lng ? parseFloat(lng) : null
    );
    res.sendSuccess(partner, 'Partner profile retrieved', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.NOT_FOUND);
  }
};

const subscribeByQrToken = async (req, res) => {
  try {
    const { qr_token } = req.body;
    if (!qr_token) {
      return res.sendError(new Error('qr_token is required'), 'qr_token is required', STATUS_CODES.BAD_REQUEST);
    }
    const result = await partnerSubscriptionService.subscribeByQrToken(req.userId, qr_token);
    res.sendSuccess(result, result.alreadySubscribed ? 'Already subscribed' : 'Successfully subscribed via QR', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const getMySubscriptionsWithDetails = async (req, res) => {
  try {
    const { lat, lng } = req.query;
    const subs = await partnerSubscriptionService.getMySubscriptionsWithDetails(
      req.userId,
      lat ? parseFloat(lat) : null,
      lng ? parseFloat(lng) : null
    );
    res.sendSuccess(subs, 'Subscriptions retrieved', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

module.exports = {
  subscribe,
  unsubscribe,
  pause,
  resume,
  getMySubscriptions,
  getSubscribers,
  updatePreferences,
  getNearbyPartners,
  getAllPartners,
  getPublicPartnerProfile,
  subscribeByQrToken,
  getMySubscriptionsWithDetails,
};
