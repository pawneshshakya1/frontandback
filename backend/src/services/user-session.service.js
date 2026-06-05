const UserSession = require('../models/user-session.model');
const UserProfile = require('../models/user-profile.model');
const UserStats = require('../models/user-stats.model');
const UserSpendAnalytics = require('../models/user-spend-analytics.model');
const Wallet = require('../models/wallet.model');
const UserPass = require('../models/user-pass.model');
const { broadcastToUser } = require('../utils/sse');

const createSession = async (userId, deviceInfo = null, ip = null) => {
  let session = await UserSession.findOne({ user_id: userId });

  if (session) {
    session.last_seen = new Date();
    session.is_online = true;
    session.login_count = (session.login_count || 0) + 1;
    session.last_login_at = new Date();
    if (deviceInfo) session.device_info = deviceInfo;
    if (ip) session.ip_address = ip;
    await session.save();
  } else {
    session = await UserSession.create({
      user_id: userId,
      is_online: true,
      last_seen: new Date(),
      last_login_at: new Date(),
      login_count: 1,
      device_info: deviceInfo,
      ip_address: ip,
    });
  }

  return session;
};

const markOffline = async (userId) => {
  await UserSession.findOneAndUpdate(
    { user_id: userId },
    { is_online: false, last_seen: new Date() }
  );
};

const createProfile = async (userId) => {
  const existing = await UserProfile.findOne({ user_id: userId });
  if (existing) return existing;

  return await UserProfile.create({ user_id: userId });
};

const createStats = async (userId) => {
  const existing = await UserStats.findOne({ user_id: userId });
  if (existing) return existing;

  return await UserStats.create({ user_id: userId });
};

const addFcmToken = async (userId, token) => {
  let session = await UserSession.findOne({ user_id: userId });
  if (!session) {
    session = await UserSession.create({ user_id: userId });
  }

  if (!session.fcm_tokens) session.fcm_tokens = [];
  if (!session.fcm_tokens.includes(token)) {
    session.fcm_tokens.push(token);
    await session.save();
  }

  return { message: 'FCM token registered' };
};

const removeFcmToken = async (userId, token) => {
  await UserSession.findOneAndUpdate(
    { user_id: userId },
    { $pull: { fcm_tokens: token } }
  );
  return { message: 'FCM token removed' };
};

const getOnlineFriends = async (userId) => {
  const Friend = require('../models/friend.model');
  const friendships = await Friend.find({
    $or: [
      { user_id: userId, status: 'ACCEPTED' },
      { friend_id: userId, status: 'ACCEPTED' },
    ],
  });

  const friendIds = friendships.map(f =>
    f.user_id.toString() === userId ? f.friend_id : f.user_id
  );

  const sessions = await UserSession.find({
    user_id: { $in: friendIds },
    is_online: true,
  }).populate('user_id', 'username avatar');

  return sessions;
};

const getUserPresence = async (userId) => {
  const session = await UserSession.findOne({ user_id: userId });
  if (!session) return { is_online: false, last_seen: null };

  return {
    is_online: session.is_online,
    last_seen: session.last_seen,
    login_count: session.login_count,
  };
};

module.exports = {
  createSession,
  markOffline,
  createProfile,
  createStats,
  addFcmToken,
  removeFcmToken,
  getOnlineFriends,
  getUserPresence,
};
