const PartnerSubscription = require('../models/partner-subscription.model');
const PartnerProfile = require('../models/partner-profile.model');
const User = require('../models/user.model');
const UserProfile = require('../models/user-profile.model');
const notificationService = require('./notification.service');
const crypto = require('crypto');
const sseService = require('./sse.service');

const generateQrToken = () => {
  return crypto.randomBytes(12).toString('hex');
};

const subscribeToPartner = async (userId, partnerId) => {
  const partner = await PartnerProfile.findById(partnerId);
  if (!partner) {
    throw new Error('Partner not found');
  }

  const existing = await PartnerSubscription.findOne({
    subscriber_id: userId,
    partner_id: partnerId,
  });

  if (existing) {
    if (existing.status === 'ACTIVE') {
      throw new Error('Already subscribed to this partner');
    }
    if (existing.status === 'CANCELLED' || existing.status === 'PAUSED') {
      existing.status = 'ACTIVE';
      await existing.save();
      return existing;
    }
  }

  const subscription = await PartnerSubscription.create({
    subscriber_id: userId,
    partner_id: partnerId,
  });

  return subscription;
};

const unsubscribeFromPartner = async (userId, partnerId) => {
  const subscription = await PartnerSubscription.findOne({
    subscriber_id: userId,
    partner_id: partnerId,
    status: 'ACTIVE',
  });

  if (!subscription) {
    throw new Error('No active subscription found');
  }

  subscription.status = 'CANCELLED';
  await subscription.save();

  return subscription;
};

const pauseSubscription = async (userId, partnerId) => {
  const subscription = await PartnerSubscription.findOne({
    subscriber_id: userId,
    partner_id: partnerId,
    status: 'ACTIVE',
  });

  if (!subscription) {
    throw new Error('No active subscription found');
  }

  subscription.status = 'PAUSED';
  await subscription.save();

  return subscription;
};

const resumeSubscription = async (userId, partnerId) => {
  const subscription = await PartnerSubscription.findOne({
    subscriber_id: userId,
    partner_id: partnerId,
    status: 'PAUSED',
  });

  if (!subscription) {
    throw new Error('No paused subscription found');
  }

  subscription.status = 'ACTIVE';
  await subscription.save();

  return subscription;
};

const getUserSubscriptions = async (userId) => {
  const subscriptions = await PartnerSubscription.find({
    subscriber_id: userId,
  }).populate('partner_id', 'business_name city state rating location');

  return subscriptions;
};

const getPartnerSubscribers = async (partnerId) => {
  const subscriptions = await PartnerSubscription.find({
    partner_id: partnerId,
    status: 'ACTIVE',
  }).populate('subscriber_id', 'username email');

  return subscriptions;
};

const updateNotificationPreferences = async (userId, partnerId, preferences) => {
  const subscription = await PartnerSubscription.findOne({
    subscriber_id: userId,
    partner_id: partnerId,
  });

  if (!subscription) {
    throw new Error('Subscription not found');
  }

  const allowedFields = ['notify_new_events', 'notify_promotions'];
  for (const key of allowedFields) {
    if (preferences[key] !== undefined) {
      subscription[key] = preferences[key];
    }
  }

  await subscription.save();
  return subscription;
};

const notifySubscribersOfEvent = async (partnerId, eventTitle, eventId) => {
  const subscribers = await PartnerSubscription.find({
    partner_id: partnerId,
    status: 'ACTIVE',
    notify_new_events: true,
  });

  const notifications = [];
  for (const sub of subscribers) {
    try {
      const notification = await notificationService.createNotification(
        sub.subscriber_id.toString(),
        'New Partner Event',
        `A new event "${eventTitle}" has been created by a partner you follow`,
        'PARTNER_EVENT',
        { partner_id: partnerId, event_id: eventId },
        partnerId
      );
      notifications.push(notification);
    } catch (error) {
      console.error(`Failed to notify subscriber ${sub.subscriber_id}:`, error.message);
    }
  }

  return { notified_count: notifications.length };
};

const findNearbyPartners = async (latitude, longitude, maxDistance = 10, limit = 20) => {
  const partners = await PartnerProfile.find({
    is_subscribable: true,
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        },
        $maxDistance: parseFloat(maxDistance) * 1000,
      },
    },
  }).limit(limit).populate('user_id', 'username email avatar');

  return partners;
};

// ============ GET ALL SUBSCRIBABLE PARTNERS (paginated + filters) ============
const getAllPartners = async ({ latitude, longitude, tier, search, limit = 30 } = {}) => {
  const query = { is_subscribable: true };
  if (tier) query.partner_tier = tier;
  if (search) {
    const re = new RegExp(search, 'i');
    query.$or = [
      { business_name: re },
      { city: re },
      { state: re },
      { bio: re },
    ];
  }

  // Use $geoNear for distance calculation if user location available
  let partners;
  if (latitude && longitude) {
    partners = await PartnerProfile.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          distanceField: 'distance_meters',
          spherical: true,
          query: query,
        },
      },
      { $limit: parseInt(limit) || 30 },
      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: '_id',
          as: 'user_info',
        },
      },
      { $unwind: { path: '$user_info', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          business_name: 1,
          bio: 1,
          logo_url: 1,
          banner_url: 1,
          city: 1,
          state: 1,
          partner_tier: 1,
          tier_label: 1,
          rating: 1,
          is_verified: 1,
          subscription_count: 1,
          total_events_created: 1,
          total_live_events: 1,
          distance_meters: 1,
          'user_info.username': 1,
          'user_info.avatar': 1,
        },
      },
    ]);
  } else {
    partners = await PartnerProfile.find(query)
      .sort({ subscription_count: -1, rating: -1 })
      .limit(parseInt(limit) || 30)
      .populate('user_id', 'username avatar');
  }

  return partners;
};

// ============ GET PUBLIC PARTNER PROFILE (by partner profile id) ============
const getPublicPartnerProfile = async (partnerProfileId, userId, userLat, userLng) => {
  const partner = await PartnerProfile.findById(partnerProfileId)
    .populate('user_id', 'username email avatar');
  if (!partner) throw new Error('Partner not found');

  // Hydrate social media links from the partner's UserProfile
  const userProfile = await UserProfile.findOne({ user_id: partner.user_id?._id })
    .select('instagram facebook x_twitter threads youtube discord_server');
  const socials = userProfile
    ? {
        instagram: userProfile.instagram || null,
        facebook: userProfile.facebook || null,
        x_twitter: userProfile.x_twitter || null,
        threads: userProfile.threads || null,
        youtube: userProfile.youtube || null,
        discord_server: userProfile.discord_server || null,
      }
    : null;

  let distance = null;
  if (userLat && userLng && partner.location?.coordinates) {
    const [lng, lat] = partner.location.coordinates;
    if (lat !== 0 || lng !== 0) {
      distance = haversineDistance(userLat, userLng, lat, lng);
    }
  }

  // Count active events
  const Match = require('../models/match.model');
  const liveEvents = await Match.countDocuments({
    created_by: partner.user_id?._id,
    status: 'OPEN',
    isPublished: true,
  });

  // Look up caller's subscription (if any) so the UI can render Subscribe/Unsubscribe/Pause correctly
  let subscription = null;
  if (userId) {
    subscription = await PartnerSubscription.findOne({
      subscriber_id: userId,
      partner_id: partner._id,
      status: 'ACTIVE',
    });
  }

  return {
    ...partner.toObject(),
    distance_km: distance !== null ? Math.round(distance * 10) / 10 : null,
    live_events_count: liveEvents,
    subscription,
    socials,
  };
};

// ============ SUBSCRIBE VIA QR TOKEN ============
const subscribeByQrToken = async (userId, qrToken) => {
  if (!qrToken) throw new Error('QR token is required');
  const partner = await PartnerProfile.findOne({ qr_token: qrToken });
  if (!partner) throw new Error('Invalid or expired QR code');
  if (!partner.is_subscribable) throw new Error('This partner is not currently accepting subscriptions');

  // Check if user is trying to subscribe to themselves
  if (partner.user_id.toString() === userId.toString()) {
    throw new Error('You cannot subscribe to yourself');
  }

  // Check existing
  const existing = await PartnerSubscription.findOne({
    subscriber_id: userId,
    partner_id: partner._id,
  });

  if (existing && existing.status === 'ACTIVE') {
    return { subscription: existing, partner, alreadySubscribed: true };
  }

  let subscription;
  if (existing) {
    existing.status = 'ACTIVE';
    await existing.save();
    subscription = existing;
  } else {
    subscription = await PartnerSubscription.create({
      subscriber_id: userId,
      partner_id: partner._id,
    });
  }

  // Update denormalized counters
  partner.subscription_count = (partner.subscription_count || 0) + 1;
  const activeCount = await PartnerSubscription.countDocuments({
    partner_id: partner._id,
    status: 'ACTIVE',
  });
  partner.active_subscribers = activeCount;
  await partner.save();

  // SSE: notify partner of new subscriber
  sseService.broadcastToUser(partner.user_id.toString(), {
    type: 'PARTNER_SUBSCRIBED',
    partner_id: partner._id.toString(),
    subscriber_id: userId,
  });

  return { subscription, partner, alreadySubscribed: false };
};

// ============ GENERATE / REGENERATE QR TOKEN FOR PARTNER ============
const generatePartnerQr = async (userId) => {
  const partner = await PartnerProfile.findOne({ user_id: userId });
  if (!partner) throw new Error('Partner profile not found');
  if (!partner.qr_token) {
    partner.qr_token = generateQrToken();
    partner.qr_generated_at = new Date();
    await partner.save();
  }
  return {
    qr_token: partner.qr_token,
    qr_code_url: `battlecore://partner/${partner.qr_token}`,
    share_url: `https://battlecore.app/partner/${partner.qr_token}`,
    web_url: `https://battlecore.app/partner/${partner.qr_token}`,
    generated_at: partner.qr_generated_at,
  };
};

const regeneratePartnerQr = async (userId) => {
  const partner = await PartnerProfile.findOne({ user_id: userId });
  if (!partner) throw new Error('Partner profile not found');
  partner.qr_token = generateQrToken();
  partner.qr_generated_at = new Date();
  await partner.save();
  return {
    qr_token: partner.qr_token,
    qr_code_url: `battlecore://partner/${partner.qr_token}`,
    share_url: `https://battlecore.app/partner/${partner.qr_token}`,
    web_url: `https://battlecore.app/partner/${partner.qr_token}`,
    generated_at: partner.qr_generated_at,
  };
};

// ============ GET MY SUBSCRIPTIONS WITH FULL DETAILS ============
const getMySubscriptionsWithDetails = async (userId, userLat, userLng) => {
  const subs = await PartnerSubscription.find({
    subscriber_id: userId,
    status: 'ACTIVE',
  }).sort('-created_at');

  // Hydrate with partner data and live event counts
  const Match = require('../models/match.model');
  const partnerIds = subs.map(s => s.partner_id);
  const partners = await PartnerProfile.find({ _id: { $in: partnerIds } })
    .populate('user_id', 'username avatar');
  const partnerMap = new Map(partners.map(p => [p._id.toString(), p]));

  const result = await Promise.all(subs.map(async s => {
    const partner = partnerMap.get(s.partner_id.toString());
    if (!partner) return null;
    const liveEvents = await Match.countDocuments({
      created_by: partner.user_id?._id,
      status: 'OPEN',
      isPublished: true,
    });
    let distance = null;
    if (userLat && userLng && partner.location?.coordinates) {
      const [lng, lat] = partner.location.coordinates;
      if (lat !== 0 || lng !== 0) {
        distance = haversineDistance(userLat, userLng, lat, lng);
      }
    }
    return {
      subscription_id: s._id,
      subscribed_at: s.created_at,
      notify_new_events: s.notify_new_events,
      partner: {
        ...partner.toObject(),
        distance_km: distance !== null ? Math.round(distance * 10) / 10 : null,
        live_events_count: liveEvents,
      },
    };
  }).filter(Boolean));

  // Sort: subscribed partners with live events first
  result.sort((a, b) => {
    if (b.partner.live_events_count !== a.partner.live_events_count) {
      return b.partner.live_events_count - a.partner.live_events_count;
    }
    if (a.partner.distance_km !== null && b.partner.distance_km !== null) {
      return a.partner.distance_km - b.partner.distance_km;
    }
    return 0;
  });

  return result;
};

// ============ UTILITY: haversine distance in km ============
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ============ INCREMENT subscription count when subscribing ============
const incrementSubscriptionCount = async (partnerId) => {
  const partner = await PartnerProfile.findById(partnerId);
  if (!partner) return;
  partner.subscription_count = (partner.subscription_count || 0) + 1;
  const activeCount = await PartnerSubscription.countDocuments({
    partner_id: partnerId,
    status: 'ACTIVE',
  });
  partner.active_subscribers = activeCount;
  await partner.save();
};

const decrementSubscriptionCount = async (partnerId) => {
  const partner = await PartnerProfile.findById(partnerId);
  if (!partner) return;
  partner.subscription_count = Math.max(0, (partner.subscription_count || 0) - 1);
  const activeCount = await PartnerSubscription.countDocuments({
    partner_id: partnerId,
    status: 'ACTIVE',
  });
  partner.active_subscribers = activeCount;
  await partner.save();
};

// Patch existing methods to update counters
const _origSubscribe = subscribeToPartner;
const subscribeToPartnerWithCount = async (userId, partnerId) => {
  const result = await _origSubscribe(userId, partnerId);
  await incrementSubscriptionCount(partnerId);
  const partner = await PartnerProfile.findById(partnerId);
  sseService.broadcastToUser(partner?.user_id?.toString() || '', {
    type: 'PARTNER_SUBSCRIBED',
    partner_id: partnerId.toString(),
    subscriber_id: userId,
  });
  return result;
};

const _origUnsubscribe = unsubscribeFromPartner;
const unsubscribeFromPartnerWithCount = async (userId, partnerId) => {
  const result = await _origUnsubscribe(userId, partnerId);
  await decrementSubscriptionCount(partnerId);
  return result;
};

module.exports = {
  subscribeToPartner: subscribeToPartnerWithCount,
  unsubscribeFromPartner: unsubscribeFromPartnerWithCount,
  pauseSubscription,
  resumeSubscription,
  getUserSubscriptions,
  getPartnerSubscribers,
  updateNotificationPreferences,
  notifySubscribersOfEvent,
  findNearbyPartners,
  getAllPartners,
  getPublicPartnerProfile,
  subscribeByQrToken,
  generatePartnerQr,
  regeneratePartnerQr,
  getMySubscriptionsWithDetails,
  generateQrToken,
};
