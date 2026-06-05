const Friend = require('../models/friend.model');
const User = require('../models/user.model');
const Notification = require('../models/notification.model');
const { broadcastToUser } = require('../utils/sse');

const sendFriendRequest = async (userId, friendEmail) => {
  const friendUser = await User.findOne({ email: friendEmail.toLowerCase() });
  if (!friendUser) throw new Error('User not found with this email');

  if (friendUser._id.toString() === userId) {
    throw new Error('Cannot send friend request to yourself');
  }

  const existingFriend = await Friend.findOne({
    $or: [
      { user_id: userId, friend_id: friendUser._id },
      { user_id: friendUser._id, friend_id: userId },
    ],
  });

  if (existingFriend) {
    if (existingFriend.status === 'ACCEPTED') {
      throw new Error('Already friends');
    }
    if (existingFriend.status === 'PENDING') {
      throw new Error('Friend request already pending');
    }
    if (existingFriend.status === 'BLOCKED') {
      throw new Error('Cannot send request to blocked user');
    }
  }

  const friendship = await Friend.create({
    user_id: userId,
    friend_id: friendUser._id,
    status: 'PENDING',
    initiated_by: userId,
  });

  const requester = await User.findById(userId).select('username email');

  await Notification.create({
    user_id: friendUser._id,
    sender_id: userId,
    title: 'Friend Request',
    body: `${requester.username} sent you a friend request`,
    type: 'FRIEND_REQUEST',
    data: {
      requester_id: userId,
      requester_username: requester.username,
      friendship_id: friendship._id,
    },
  });

  broadcastToUser(friendUser._id.toString(), {
    type: 'FRIEND_REQUEST',
    data: {
      requester_id: userId,
      requester_username: requester.username,
      requester_email: requester.email,
    },
  });

  return { message: 'Friend request sent', friendship };
};

const acceptFriendRequest = async (userId, friendshipId) => {
  const friendship = await Friend.findById(friendshipId);
  if (!friendship) throw new Error('Friend request not found');

  if (friendship.friend_id.toString() !== userId) {
    throw new Error('Not authorized to accept this request');
  }

  if (friendship.status !== 'PENDING') {
    throw new Error('Request already processed');
  }

  friendship.status = 'ACCEPTED';
  await friendship.save();

  const friend = await User.findById(friendship.user_id).select('username');

  await Notification.create({
    user_id: friendship.user_id,
    sender_id: userId,
    title: 'Friend Request Accepted',
    body: `${friend?.username || 'User'} accepted your friend request`,
    type: 'FRIEND_REQUEST',
    data: { friendship_id: friendship._id },
  });

  broadcastToUser(friendship.user_id.toString(), {
    type: 'FRIEND_REQUEST_ACCEPTED',
    data: { friend_id: userId },
  });

  return { message: 'Friend request accepted', friendship };
};

const rejectFriendRequest = async (userId, friendshipId) => {
  const friendship = await Friend.findById(friendshipId);
  if (!friendship) throw new Error('Friend request not found');

  if (friendship.friend_id.toString() !== userId) {
    throw new Error('Not authorized to reject this request');
  }

  await Friend.findByIdAndDelete(friendshipId);

  return { message: 'Friend request rejected' };
};

const removeFriend = async (userId, friendId) => {
  const friendship = await Friend.findOne({
    $or: [
      { user_id: userId, friend_id: friendId, status: 'ACCEPTED' },
      { user_id: friendId, friend_id: userId, status: 'ACCEPTED' },
    ],
  });

  if (!friendship) throw new Error('Friendship not found');

  await Friend.findByIdAndDelete(friendship._id);

  return { message: 'Friend removed' };
};

const blockUser = async (userId, friendId) => {
  let friendship = await Friend.findOne({
    $or: [
      { user_id: userId, friend_id: friendId },
      { user_id: friendId, friend_id: userId },
    ],
  });

  if (friendship) {
    friendship.status = 'BLOCKED';
    friendship.blocked_by = userId;
    await friendship.save();
  } else {
    friendship = await Friend.create({
      user_id: userId,
      friend_id: friendId,
      status: 'BLOCKED',
      initiated_by: userId,
      blocked_by: userId,
    });
  }

  return { message: 'User blocked', friendship };
};

const unblockUser = async (userId, friendId) => {
  const friendship = await Friend.findOne({
    $or: [
      { user_id: userId, friend_id: friendId },
      { user_id: friendId, friend_id: userId }
    ],
    status: 'BLOCKED',
    blocked_by: userId,
  });

  if (!friendship) throw new Error('Blocked user not found');

  await Friend.findByIdAndDelete(friendship._id);

  return { message: 'User unblocked' };
};

const getFriends = async (userId) => {
  const friendships = await Friend.find({
    $or: [
      { user_id: userId, status: 'ACCEPTED' },
      { friend_id: userId, status: 'ACCEPTED' },
    ],
  }).populate('user_id friend_id', 'username email avatar');

  const UserSession = require('../models/user-session.model');
  const sessions = await UserSession.find({
    user_id: { $in: friendships.map(f =>
      f.user_id._id.toString() === userId ? f.friend_id._id : f.user_id._id
    )}
  });

  const onlineMap = {};
  sessions.forEach(s => { onlineMap[s.user_id.toString()] = s.is_online; });

  return friendships.map(f => {
    const friend = f.user_id._id.toString() === userId ? f.friend_id : f.user_id;
    return {
      _id: f._id,
      user: friend,
      is_online: onlineMap[friend._id.toString()] || false,
      created_at: f.created_at,
    };
  });
};

const getPendingRequests = async (userId) => {
  const requests = await Friend.find({
    friend_id: userId,
    status: 'PENDING',
  }).populate('user_id', 'username email avatar');

  return requests.map(r => ({
    _id: r._id,
    requester: r.user_id,
    created_at: r.created_at,
  }));
};

const getSentRequests = async (userId) => {
  const requests = await Friend.find({
    user_id: userId,
    status: 'PENDING',
  }).populate('friend_id', 'username email avatar');

  return requests.map(r => ({
    _id: r._id,
    recipient: r.friend_id,
    created_at: r.created_at,
  }));
};

const getBlockedUsers = async (userId) => {
  const blocked = await Friend.find({
    status: 'BLOCKED',
    blocked_by: userId,
  }).populate('user_id friend_id', 'username email');

  return blocked.map(b => ({
    _id: b._id,
    user: b.user_id._id.toString() === userId ? b.friend_id : b.user_id,
  }));
};

const notifyFriendsOfEvent = async (creatorId, eventData) => {
  const friendships = await Friend.find({
    $or: [
      { user_id: creatorId, status: 'ACCEPTED' },
      { friend_id: creatorId, status: 'ACCEPTED' },
    ],
  });

  const creator = await User.findById(creatorId).select('username');

  const friendIds = friendships.map(f =>
    f.user_id.toString() === creatorId ? f.friend_id.toString() : f.user_id.toString()
  );

  const notifications = friendIds.map(friendId => ({
    user_id: friendId,
    sender_id: creatorId,
    title: 'Friend Created an Event',
    body: `${creator.username} created a new event: ${eventData.title}`,
    type: 'FRIEND_EVENT',
    data: {
      match_id: eventData.match_id,
      creator_username: creator.username,
      entry_fee: eventData.entry_fee,
      match_date: eventData.match_date,
      match_time: eventData.match_time,
    },
  }));

  if (notifications.length > 0) {
    await Notification.insertMany(notifications);

    friendIds.forEach(friendId => {
      broadcastToUser(friendId, {
        type: 'FRIEND_EVENT',
        data: {
          match_id: eventData.match_id,
          creator_username: creator.username,
          title: eventData.title,
        },
      });
    });
  }

  return { notified_count: friendIds.length };
};

// Search users by email or username. Returns up to `limit` users
// (default 20) excluding the requester, with a per-user `friend_status`
// field describing any existing relationship (none, pending_in,
// pending_out, accepted, blocked). Used by the "Add Friend" sheet in
// the chat header to discover people by typing an email or name.
const searchUsers = async (userId, query, limit = 20) => {
  if (!query || !query.trim()) return [];

  const safe = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rx = new RegExp(safe, 'i');
  const exactEmail = query.trim().toLowerCase();

  const user = await User.findOne({ _id: userId }).select('email');
  if (!user) return [];

  const matches = await User.find({
    _id: { $ne: userId },
    is_active: { $ne: false },
    $or: [
      { email: exactEmail },
      { email: rx },
      { username: rx },
    ],
  })
    .select('username email avatar')
    .limit(limit);

  if (matches.length === 0) return [];

  // Resolve friend relationships in one query
  const ids = matches.map((m) => m._id);
  const rels = await Friend.find({
    $or: [
      { user_id: userId, friend_id: { $in: ids } },
      { friend_id: userId, user_id: { $in: ids } },
    ],
  });

  const relMap = new Map();
  rels.forEach((r) => {
    const other = r.user_id.toString() === userId.toString() ? r.friend_id.toString() : r.user_id.toString();
    relMap.set(other, r);
  });

  return matches.map((m) => {
    const rel = relMap.get(m._id.toString());
    let friend_status = 'none';
    if (rel) {
      if (rel.status === 'BLOCKED') friend_status = 'blocked';
      else if (rel.status === 'ACCEPTED') friend_status = 'accepted';
      else if (rel.status === 'PENDING') {
        friend_status = rel.user_id.toString() === userId.toString() ? 'pending_out' : 'pending_in';
      }
    }
    return {
      _id: m._id,
      username: m.username,
      email: m.email,
      avatar: m.avatar || null,
      friend_status,
      friendship_id: rel ? rel._id : null,
    };
  });
};

module.exports = {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  blockUser,
  unblockUser,
  getFriends,
  getPendingRequests,
  getSentRequests,
  getBlockedUsers,
  notifyFriendsOfEvent,
  searchUsers,
};
