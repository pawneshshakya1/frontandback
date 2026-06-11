// Match lifecycle service — owns create / update / delete / cancel,
// draft / publish, share / invite, and the public + private read
// paths. Previously these were all jammed into match.service.js
// alongside payment, result, and credential flows.

const crypto = require('crypto');
const Match = require('../models/match.model');
const User = require('../models/user.model');
const ElitePass = require('../models/elitePass.model');
const emailService = require('./email.service');
const friendService = require('./friend.service');
const spendAnalyticsService = require('./user-spend-analytics.service');
const credentialsService = require('./match-credentials.service');
const { getMatchStartDateTime } = require('../utils/match-time.util');
const { broadcast, broadcastToUser, broadcastToUsers } = require('../utils/sse');

// Default limits for users without any pass
const DEFAULT_DAILY_LIMIT = 1;

// Cache for dynamic pass limits (refreshes every 5 minutes)
let passLimitsCache = {
  data: null,
  updatedAt: null,
  cacheDuration: 5 * 60 * 1000, // 5 minutes
};

const invalidatePassLimitsCache = () => {
  passLimitsCache.data = null;
  passLimitsCache.updatedAt = null;
};

const getPassLimits = async () => {
  const now = Date.now();
  if (passLimitsCache.data && (now - passLimitsCache.updatedAt) < passLimitsCache.cacheDuration) {
    return passLimitsCache.data;
  }

  try {
    const passes = await ElitePass.find({ is_active: true, pass_category: 'user' }).select('pass_type event_count color name duration_days');
    const limits = {
      daily: {},
      total: {},
      passConfig: {},
    };

    for (const pass of passes) {
      const passType = pass.pass_type;
      const eventCount = pass.event_count || 30;
      limits.total[passType] = eventCount;
      // For user passes, daily limit is calculated as total/duration + some buffer
      // Default: roughly 1/3 of total events per day for 30 days
      const dailyLimit = Math.max(1, Math.ceil(eventCount / pass.duration_days));
      limits.daily[passType] = dailyLimit;
      limits.passConfig[passType] = {
        event_count: eventCount,
        duration_days: pass.duration_days,
        color: pass.color,
        name: pass.name,
      };
    }

    passLimitsCache.data = limits;
    passLimitsCache.updatedAt = now;
    return limits;
  } catch (error) {
    console.error('Error fetching pass limits:', error);
    // Return minimal defaults
    return {
      daily: { none: 1 },
      total: {},
      passConfig: {},
    };
  }
};

// 16-byte hex token used for share links (e.g. battlecore://event/<token>).
const generateShareToken = () => crypto.randomBytes(16).toString('hex');

// 6-char invite code, alphabet excludes confusing chars (I, O, 0, 1).
const generateInviteCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const getEffectivePassType = async (userId) => {
  const UserPass = require('../models/user-pass.model');
  const User = require('../models/user.model');
  const activePass = await UserPass.findOne({
    user_id: userId,
    status: 'ACTIVE',
    expires_at: { $gt: new Date() },
  }).sort({ expires_at: -1 });

  if (activePass) {
    const now = new Date();
    const lastReset = activePass.last_daily_reset || new Date(0);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (lastReset < todayStart) {
      activePass.daily_events_used = 0;
      activePass.last_daily_reset = now;
      await activePass.save();
    }
    return activePass.pass_type;
  }

  // Fallback: check User model for old purchases (before UserPass tracking)
  const user = await User.findById(userId).select('pass_type pass_expiry').lean();
  if (user && user.pass_type && user.pass_type !== 'none' && user.pass_expiry && new Date(user.pass_expiry) > new Date()) {
    return user.pass_type;
  }

  return 'none';
};

const getDailyEventCount = async (userId) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return Match.countDocuments({ created_by: userId, createdAt: { $gte: todayStart } });
};

// Get total event limit info for Elite Pass holders
const getTotalEventLimit = async (userId) => {
  const User = require('../models/user.model');

  const user = await User.findById(userId).select('pass_type pass_expiry pass_event_count pass_events_used role');
  if (!user) return null;

  if (user.role === 'ADMIN' || user.role === 'PARTNER') {
    return {
      is_unlimited: true,
      pass_type: user.role.toLowerCase(),
      total_limit: -1,
      used: 0,
      remaining: -1
    };
  }

  const passType = await getEffectivePassType(userId);
  const limits = await getPassLimits();

  // Check if user has active Elite Pass (not 'none')
  if (passType === 'none' || !limits.passConfig[passType]) {
    // Fallback: check User model for old purchases
    const hasUserModelPass = user.pass_type && user.pass_type !== 'none'
      && user.pass_expiry && new Date(user.pass_expiry) > new Date()
      && user.pass_event_count;

    if (hasUserModelPass) {
      const used = user.pass_events_used || 0;
      const remaining = Math.max(0, user.pass_event_count - used);
      return {
        pass_type: user.pass_type,
        total_limit: user.pass_event_count,
        used: used,
        remaining: remaining,
        is_unlimited: false,
        pass_expiry: user.pass_expiry,
        pass_name: null,
        daily_limit: limits.daily[user.pass_type] || DEFAULT_DAILY_LIMIT,
        limit_type: 'total',
      };
    }

    return {
      is_unlimited: false,
      pass_type: passType,
      total_limit: limits.total[passType] || null,
      used: user.pass_events_used || 0,
      remaining: 0,
      daily_limit: limits.daily[passType] || DEFAULT_DAILY_LIMIT,
      limit_type: 'daily',
    };
  }

  const passConfig = limits.passConfig[passType];
  const totalLimit = passConfig.event_count;
  const used = user.pass_events_used || 0;
  const remaining = Math.max(0, totalLimit - used);

  return {
    pass_type: passType,
    total_limit: totalLimit,
    used: used,
    remaining: remaining,
    is_unlimited: false,
    pass_expiry: user.pass_expiry,
    pass_name: passConfig.name,
    pass_color: passConfig.color,
    daily_limit: limits.daily[passType] || DEFAULT_DAILY_LIMIT,
    limit_type: 'total',
  };
};

const checkMatchStatus = async (match) => {
  if (!match || match.status !== 'OPEN') return match;

  try {
    const start = getMatchStartDateTime(match);
    if (start && start.getTime() < Date.now()) {
      match.status = 'ONGOING';
      await match.save();
      broadcast({ type: 'STATUS_UPDATE', matchId: match._id.toString(), status: 'ONGOING' });
    }
  } catch (error) {
    console.error(`Error checking match status for ${match._id}:`, error);
  }
  return match;
};

const createMatch = async (userId, matchData) => {
  const {
    title, banner_url, game_type, mode, max_players, map,
    entry_fee, prize_pool, match_date, match_time, mediator_email,
    standard_restrictions, additional_rules, latitude, longitude,
    isPublished, room_id: providedRoomId, room_password,
    is_sponsored, is_premium, is_friend_only,
  } = matchData;

  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  if (user.role !== 'ADMIN' && user.role !== 'PARTNER') {
    if (is_sponsored || is_premium) {
      throw new Error('Only Partners and Admins can create sponsored or premium events');
    }
  }

  // ============ ELITE PASS EVENT QUOTA (USER ELITE PASS HOLDERS) ============
  // For non-partner, non-admin users with an active user Elite Pass,
  // enforce a total event count quota (per active pass window) instead of a daily limit.
  // Limits are dynamically read from ElitePass collection in database.
  let isEliteUser = false;
  if (user.role !== 'ADMIN' && user.role !== 'PARTNER') {
    const passType = await getEffectivePassType(userId);
    const limits = await getPassLimits();
    const passConfig = limits.passConfig[passType];

    if (passConfig && user.pass_event_count) {
      // User has an Elite Pass with event_count configured
      isEliteUser = true;
      const used = user.pass_events_used || 0;
      const total = user.pass_event_count;
      if (used >= total) {
        throw new Error(
          `Event limit reached (${used}/${total}). Your ${passConfig.name || passType} Pass quota is exhausted for this cycle.`
        );
      }
    } else {
      // Fallback daily limit for non-elite users or users without pass config
      const dailyLimit = limits.daily[passType] || DEFAULT_DAILY_LIMIT;
      const todayCount = await getDailyEventCount(userId);
      if (todayCount >= dailyLimit) {
        const passName = passType === 'none' ? 'Free' : (passConfig?.name || passType.charAt(0).toUpperCase() + passType.slice(1));
        throw new Error(
          `Daily event limit reached (${todayCount}/${dailyLimit}). ` +
          (passType === 'none' ? 'Upgrade to an Elite Pass to create more events!' : `Your ${passName} Pass allows ${dailyLimit} events/day.`)
        );
      }
    }
  }

  if (parseFloat(entry_fee) < 0) throw new Error('Entry fee cannot be negative');
  if (parseFloat(prize_pool) < 0) throw new Error('Prize pool cannot be negative');

  const room_id = providedRoomId || null;

  let mediator_user_id = null;
  if (mediator_email) {
    const mediator = await User.findOne({ email: mediator_email.toLowerCase() });
    if (mediator) mediator_user_id = mediator._id;
  }

  let location = null;
  if (latitude && longitude) {
    location = { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] };
  }

  const willPublish = isPublished !== undefined ? isPublished : false;
  const status = willPublish ? 'OPEN' : 'DRAFT';

  const match = await Match.create({
    created_by: userId, title, banner_url, game_type, mode,
    max_players: max_players || (game_type === 'BR' ? 52 : 2),
    map, room_id, room_password,
    entry_fee: parseFloat(entry_fee) || 0,
    prize_pool: parseFloat(prize_pool) || 0,
    match_date, match_time, mediator_email, mediator_user_id,
    standard_restrictions, additional_rules, location,
    isPublished: willPublish,
    is_sponsored: !!is_sponsored,
    is_premium: !!is_premium,
    event_category: is_premium ? 'premium' : is_sponsored ? 'sponsored' : 'standard',
    is_friend_only: isEliteUser ? (is_friend_only !== false) : false, // default true for elite users
    status,
    published_at: willPublish ? new Date() : null,
    share_token: willPublish ? generateShareToken() : null,
    invite_code: willPublish ? generateInviteCode() : null,
  });

  // Bump the user's elite pass usage counter
  if (isEliteUser) {
    await User.findByIdAndUpdate(userId, { $inc: { pass_events_used: 1 } });
  }

  await spendAnalyticsService.updateOnEventCreated(userId);

  if (mediator_email && match.isPublished) {
    await emailService.sendEmail({
      to: mediator_email,
      subject: `You have been selected as a mediator for ${title}`,
      text: `You have been selected as a mediator for "${title}" (Room ID: ${room_id}).`,
      html: `<p>You have been selected as a mediator for <strong>${title}</strong> (Room ID: ${room_id}).</p>`,
    });
  }

  if (willPublish) {
    broadcast({ type: 'MATCH_UPDATE', action: 'create', matchId: match._id.toString() });
    broadcast({
      type: 'MATCH_PUBLISHED',
      matchId: match._id.toString(),
      title: match.title,
      entry_fee: match.entry_fee,
    });
    await friendService.notifyFriendsOfEvent(userId, {
      match_id: match._id.toString(),
      title: match.title,
      entry_fee: match.entry_fee,
      match_date: match.match_date,
      match_time: match.match_time,
    });
  } else {
    broadcast({
      type: 'MATCH_DRAFTED',
      matchId: match._id.toString(),
      title: match.title,
    });
  }

  return match;
};

const updateMatch = async (matchId, userId, updateData) => {
  const match = await Match.findById(matchId);
  if (!match) throw new Error('Match not found');

  if (match.created_by.toString() !== userId.toString()) {
    throw new Error('Not authorized');
  }

  if (match.isPublished && !updateData.forceUpdate) {
    throw new Error('Cannot edit published match');
  }

  // Whitelist allowed update fields (prevents tampering with sensitive fields like commission_amount, match_id, _id, etc.)
  const ALLOWED_FIELDS = [
    'title', 'description', 'game_type', 'entry_fee', 'prize_pool',
    'max_players', 'match_start_time', 'region', 'rules',
    'room_id', 'room_password', 'mediator_email',
    'isPublished', 'is_sponsored', 'is_premium', 'is_offline',
    'venue', 'latitude', 'longitude', 'banner_url', 'tags', 'forceUpdate',
  ];
  const filtered = {};
  for (const key of ALLOWED_FIELDS) {
    if (updateData[key] !== undefined) {
      filtered[key] = updateData[key];
    }
  }

  const updatedMatch = await Match.findByIdAndUpdate(matchId, filtered, { new: true });

  if (!match.isPublished && updatedMatch.isPublished && updatedMatch.mediator_email) {
    await emailService.sendEmail({
      to: updatedMatch.mediator_email,
      subject: `You have been selected as a mediator for ${updatedMatch.title}`,
      text: `You have been selected as a mediator for "${updatedMatch.title}" (Room ID: ${updatedMatch.room_id}).`,
      html: `<p>You have been selected as a mediator for <strong>${updatedMatch.title}</strong> (Room ID: ${updatedMatch.room_id}).</p>`,
    });
  }

  broadcast({ type: 'MATCH_UPDATE', action: 'update', matchId: matchId.toString() });

  return updatedMatch;
};

const deleteMatch = async (matchId, userId) => {
  const match = await Match.findById(matchId);
  if (!match) throw new Error('Match not found');

  if (match.created_by.toString() !== userId.toString()) {
    throw new Error('Not authorized');
  }

  if (match.isPublished) throw new Error('Cannot delete published match');

  await Match.deleteOne({ _id: matchId });
  broadcast({ type: 'MATCH_UPDATE', action: 'delete', matchId: matchId.toString() });

  return { success: true };
};

const getMatch = async (matchId, currentUser = null) => {
  const match = await Match.findById(matchId).populate('created_by', 'username');

  if (match) {
    await checkMatchStatus(match);

    if (match.results && match.results.screenshot_urls && match.results.screenshot_urls.length > 0) {
      const isCreator = currentUser && currentUser.id === match.created_by._id.toString();
      const isMediator = currentUser && (
        (match.mediator_user_id && currentUser.id === match.mediator_user_id.toString()) ||
        (match.mediator_email && currentUser.email.toLowerCase() === match.mediator_email.toLowerCase())
      );
      const isAdmin = currentUser && currentUser.role === 'ADMIN';

      if (!isCreator && !isMediator && !isAdmin) {
        match.results.screenshot_urls = [];
      }
    }

    if (currentUser) {
      credentialsService.maskCredentialsForViewer(match, currentUser.id);
    } else {
      match.credentials_visible = false;
    }
  }
  return match;
};

const getAllMatches = async (coordinates, currentUserId = null) => {
  let query = { status: 'OPEN', isPublished: { $ne: false } };

  if (coordinates && coordinates.latitude && coordinates.longitude) {
    query.location = {
      $near: {
        $geometry: { type: 'Point', coordinates: [parseFloat(coordinates.longitude), parseFloat(coordinates.latitude)] },
        $maxDistance: 50000,
      },
    };
  }

  if (coordinates && coordinates.featured === 'true') {
    query.$or = [{ is_premium: true }, { is_sponsored: true }];
  }

  const matches = await Match.find(query).sort('-createdAt');

  const updatedMatches = await Promise.all(matches.map(async (m) => {
    await checkMatchStatus(m);
    return m.status === 'OPEN' ? m : null;
  }));

  const open = updatedMatches.filter(m => m !== null);

  // Prioritize events from subscribed partners
  if (currentUserId) {
    try {
      const PartnerSubscription = require('../models/partner-subscription.model');
      const PartnerProfile = require('../models/partner-profile.model');

      const subs = await PartnerSubscription.find({
        subscriber_id: currentUserId,
        status: 'ACTIVE',
      });

      if (subs.length > 0) {
        const subscribedPartnerUserIds = await PartnerProfile.find({
          _id: { $in: subs.map(s => s.partner_id) },
        }).distinct('user_id');

        const subscribedSet = new Set(subscribedPartnerUserIds.map(id => id.toString()));
        return open.sort((a, b) => {
          const aSub = subscribedSet.has(a.created_by?.toString() || '');
          const bSub = subscribedSet.has(b.created_by?.toString() || '');
          if (aSub && !bSub) return -1;
          if (!aSub && bSub) return 1;
          return 0;
        });
      }
    } catch (err) {
      console.error('Failed to prioritize subscribed partners:', err.message);
    }
  }

  return open;
};

const getJoinedMatches = async (userId) => {
  const matches = await Match.find({ 'participants.user_id': userId }).sort('-createdAt');
  await Promise.all(matches.map(async (m) => { await checkMatchStatus(m); }));
  matches.forEach((m) => credentialsService.maskCredentialsForViewer(m, userId));
  return matches;
};

const getCreatedMatches = async (userId) => {
  const matches = await Match.find({ created_by: userId }).sort('-createdAt');
  await Promise.all(matches.map(async (m) => { await checkMatchStatus(m); }));
  matches.forEach((m) => credentialsService.maskCredentialsForViewer(m, userId));
  return matches;
};

const cancelMatch = async (matchId, userId, reason) => {
  const match = await Match.findById(matchId);
  if (!match) throw new Error('Match not found');
  if (match.created_by.toString() !== userId.toString()) {
    throw new Error('Not authorized to cancel this event');
  }
  if (match.status === 'CANCELLED') throw new Error('Match already cancelled');
  if (match.status === 'COMPLETED') throw new Error('Cannot cancel completed match');

  const walletService = require('./wallet.service');
  const Transaction = require('../models/transaction.model');
  const refundResults = {
    total: match.participants.length,
    refunded: 0,
    failed: 0,
    details: [],
  };

  for (const participant of match.participants) {
    try {
      const lockTxn = await Transaction.findOne({
        user_id: participant.user_id,
        match_id: match._id,
        type: 'LOCK',
        status: 'SUCCESS',
      }).sort({ createdAt: -1 });

      const refundAmount = lockTxn ? lockTxn.amount : match.entry_fee;

      if (refundAmount <= 0) {
        refundResults.details.push({
          user_id: participant.user_id,
          status: 'skipped',
          reason: 'No locked amount to refund',
        });
        continue;
      }

      await walletService.unlockFunds(
        participant.user_id,
        refundAmount,
        match._id,
        `Refund: Event "${match.title}" cancelled`
      );

      refundResults.refunded += 1;
      refundResults.details.push({
        user_id: participant.user_id,
        status: 'refunded',
        amount: refundAmount,
      });
    } catch (err) {
      console.error(`Refund failed for user ${participant.user_id}:`, err.message);
      refundResults.failed += 1;
      refundResults.details.push({
        user_id: participant.user_id,
        status: 'failed',
        error: err.message,
      });
    }
  }

  match.status = 'CANCELLED';
  match.cancelled_at = new Date();
  match.cancelled_by = userId;
  match.cancel_reason = reason || 'Cancelled by host';
  match.refund_summary = refundResults;
  await match.save();

  const participantIds = match.participants.map(p => p.user_id.toString());
  broadcastToUsers(participantIds, {
    type: 'MATCH_CANCELLED',
    matchId: match._id.toString(),
    title: match.title,
    reason: match.cancel_reason,
  });
  broadcast({ type: 'MATCH_UPDATE', action: 'cancelled', matchId: match._id.toString() });

  console.log(
    `[cancelMatch] ${match._id} "${match.title}": ` +
    `${refundResults.refunded}/${refundResults.total} refunded, ${refundResults.failed} failed`
  );

  return { match, refundResults };
};

const shareMatch = async (matchId, userId) => {
  const match = await Match.findById(matchId);
  if (!match) throw new Error('Match not found');
  if (match.created_by.toString() !== userId.toString()) {
    throw new Error('Not authorized to share this event');
  }
  if (!match.isPublished) {
    throw new Error('Only published events can be shared');
  }
  if (!match.share_token) {
    match.share_token = generateShareToken();
  }
  if (!match.invite_code) {
    match.invite_code = generateInviteCode();
  }
  match.share_count = (match.share_count || 0) + 1;
  await match.save();

  return {
    share_token: match.share_token,
    invite_code: match.invite_code,
    share_url: `battlecore://event/${match.share_token}`,
    web_url: `https://battlecore.app/event/${match.share_token}`,
    share_count: match.share_count,
  };
};

const joinByInviteCode = async (userId, inviteCode) => {
  const match = await Match.findOne({ invite_code: inviteCode.toUpperCase() });
  if (!match) throw new Error('Invalid invite code');
  if (!match.isPublished) throw new Error('Event is not published');
  if (match.status !== 'OPEN') throw new Error('Event is not open');
  if (match.created_by.toString() === userId.toString()) {
    throw new Error('You cannot join your own event');
  }
  const isAlreadyJoined = match.participants.some(
    p => p.user_id.toString() === userId.toString()
  );
  if (isAlreadyJoined) throw new Error('Already joined this event');
  if (match.participants.length >= match.max_players) {
    throw new Error('Event is full');
  }

  if (!match.shared_with.some(id => id.toString() === userId.toString())) {
    match.shared_with.push(userId);
  }

  const walletService = require('./wallet.service');
  await walletService.lockFunds(userId, match.entry_fee, match._id);
  match.participants.push({ user_id: userId });
  await match.save();

  broadcastToUser(match.created_by.toString(), {
    type: 'MATCH_JOINED',
    matchId: match._id.toString(),
    title: match.title,
    joined_by: userId,
  });
  broadcast({ type: 'MATCH_UPDATE', action: 'join', matchId: match._id.toString() });

  return match;
};

const getMatchByShareToken = async (shareToken) => {
  const match = await Match.findOne({ share_token: shareToken })
    .select('-__v')
    .populate('created_by', 'username avatar_url');
  if (!match) throw new Error('Event not found');
  return match;
};

const getDrafts = async (userId) => {
  return Match.find({
    created_by: userId,
    $or: [{ status: 'DRAFT' }, { isPublished: false }],
  }).sort('-updatedAt');
};

const getInvites = async (userId) => {
  return Match.find({ shared_with: userId, isPublished: true })
    .sort('-createdAt')
    .populate('created_by', 'username avatar_url');
};

const publishDraft = async (matchId, userId) => {
  const match = await Match.findById(matchId);
  if (!match) throw new Error('Match not found');
  if (match.created_by.toString() !== userId.toString()) {
    throw new Error('Not authorized');
  }
  if (match.isPublished) throw new Error('Event already published');

  match.isPublished = true;
  match.status = 'OPEN';
  match.published_at = new Date();
  match.share_token = match.share_token || generateShareToken();
  match.invite_code = match.invite_code || generateInviteCode();
  await match.save();

  broadcast({ type: 'MATCH_UPDATE', action: 'publish', matchId: match._id.toString() });
  broadcast({
    type: 'MATCH_PUBLISHED',
    matchId: match._id.toString(),
    title: match.title,
    entry_fee: match.entry_fee,
  });

  return match;
};

module.exports = {
  checkMatchStatus,
  getMatch,
  getAllMatches,
  getJoinedMatches,
  getCreatedMatches,
  createMatch,
  updateMatch,
  deleteMatch,
  cancelMatch,
  shareMatch,
  joinByInviteCode,
  getMatchByShareToken,
  getDrafts,
  getInvites,
  publishDraft,
  generateShareToken,
  generateInviteCode,
  getEffectivePassType,
  getDailyEventCount,
  getTotalEventLimit,
  getPassLimits,
  invalidatePassLimitsCache,
};
