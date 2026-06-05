// Chat service — manages 1:1 conversations and messages.
// All chat access is gated on a verified friendship between the two
// participants. Additionally, USER-role accounts must have an active
// Elite Pass (or be a Partner/Admin) to use chat.

const Conversation = require('../models/conversation.model');
const Message = require('../models/message.model');
const Friend = require('../models/friend.model');
const User = require('../models/user.model');
const { broadcastToUser } = require('../utils/sse');

// Ordered key used to look up / dedupe conversations regardless of who initiated.
const pairKey = (a, b) => [a.toString(), b.toString()].sort().join(':');

const isFriendPair = async (userA, userB) => {
  const f = await Friend.findOne({
    status: 'ACCEPTED',
    $or: [
      { user_id: userA, friend_id: userB },
      { user_id: userB, friend_id: userA },
    ],
  });
  return !!f;
};

const isChatEligible = async (userId) => {
  const user = await User.findById(userId).select('role pass_type pass_expiry');
  if (!user) return false;
  // Admins and Partners can always chat.
  if (user.role === 'ADMIN' || user.role === 'PARTNER') return true;
  // Regular users need an active Elite Pass.
  if (user.pass_type && user.pass_expiry && new Date(user.pass_expiry) > new Date()) {
    if (['pro', 'elite', 'supreme'].includes(user.pass_type)) return true;
  }
  return false;
};

const ensureChatEligibility = async (userId, otherId) => {
  if (userId.toString() === otherId.toString()) {
    throw new Error('You cannot chat with yourself');
  }
  if (!(await isFriendPair(userId, otherId))) {
    throw new Error('You can only chat with your friends');
  }
  // Only the SENDER needs an active Elite Pass. The receiver doesn't
  // need one — if they don't have a pass, they just won't be able to
  // reply. This lets a Pro/Elite/Supreme user start a conversation
  // with a friend who hasn't purchased a pass yet.
  if (!(await isChatEligible(userId))) {
    throw new Error('Chat is available only with an active Elite Pass');
  }
};

const getOrCreateConversation = async (userA, userB) => {
  let conv = await Conversation.findOne({ participants: { $all: [userA, userB] } });
  if (conv) return conv;
  conv = await Conversation.create({ participants: [userA, userB] });
  return conv;
};

const listConversations = async (userId) => {
  const convs = await Conversation.find({ participants: userId })
    .sort({ last_message_at: -1 })
    .populate('participants', 'username avatar role pass_type pass_expiry')
    .populate('last_message_sender', 'username');

  return convs.map((c) => {
    const obj = c.toObject();
    const other = obj.participants.find((p) => p._id.toString() !== userId.toString());
    const unread = c.last_message_sender
      && c.last_message_sender.toString() !== userId.toString()
      && (!c.read_at || new Date(c.read_at) < new Date(c.last_message_at));
    let other_has_pass = false;
    if (other) {
      if (other.role === 'ADMIN' || other.role === 'PARTNER') other_has_pass = true;
      else if (other.pass_type && ['pro', 'elite', 'supreme'].includes(other.pass_type)
               && other.pass_expiry && new Date(other.pass_expiry) > new Date()) other_has_pass = true;
    }
    return {
      _id: obj._id,
      other_user: other ? { _id: other._id, username: other.username, avatar: other.avatar } : null,
      other_has_pass,
      last_message: obj.last_message,
      last_message_at: obj.last_message_at,
      last_message_sender: obj.last_message_sender?._id || null,
      unread: !!unread,
    };
  });
};

const listMessages = async (userId, conversationId) => {
  const conv = await Conversation.findById(conversationId);
  if (!conv) throw new Error('Conversation not found');
  if (!conv.participants.some((p) => p.toString() === userId.toString())) {
    throw new Error('Not authorized to view this conversation');
  }
  const messages = await Message.find({ conversation_id: conversationId })
    .sort({ created_at: 1 })
    .populate('sender_id', 'username avatar');
  // Mark unread incoming messages as read.
  await Message.updateMany(
    { conversation_id: conversationId, sender_id: { $ne: userId }, read_at: null },
    { $set: { read_at: new Date() } }
  );
  return messages.map((m) => ({
    _id: m._id,
    sender_id: m.sender_id._id,
    content: m.content,
    created_at: m.created_at,
    read_at: m.read_at,
  }));
};

const sendMessage = async (userId, otherUserId, content) => {
  if (!content || !content.trim()) throw new Error('Message cannot be empty');
  await ensureChatEligibility(userId, otherUserId);
  const conv = await getOrCreateConversation(userId, otherUserId);
  const message = await Message.create({
    conversation_id: conv._id,
    sender_id: userId,
    content: content.trim(),
  });
  conv.last_message = message.content;
  conv.last_message_at = message.created_at;
  conv.last_message_sender = userId;
  await conv.save();

  // Real-time push to the other participant if they're online.
  const User = require('../models/user.model');
  const sender = await User.findById(userId).select('username avatar');
  broadcastToUser(otherUserId.toString(), {
    type: 'CHAT_MESSAGE',
    conversation_id: conv._id.toString(),
    sender: sender ? { _id: sender._id, username: sender.username, avatar: sender.avatar } : { _id: userId },
    content: message.content,
    created_at: message.created_at,
  });

  return message;
};

const getOrCreateWithFriend = async (userId, friendId) => {
  await ensureChatEligibility(userId, friendId);
  const conv = await getOrCreateConversation(userId, friendId);
  const convObj = conv.toObject();
  const otherId = convObj.participants.find((p) => p.toString() !== userId.toString());
  let other_has_pass = false;
  if (otherId) {
    const friend = await User.findById(otherId).select('role pass_type pass_expiry username avatar');
    if (friend) {
      if (friend.role === 'ADMIN' || friend.role === 'PARTNER') other_has_pass = true;
      else if (friend.pass_type && ['pro', 'elite', 'supreme'].includes(friend.pass_type)
               && friend.pass_expiry && new Date(friend.pass_expiry) > new Date()) other_has_pass = true;
    }
  }
  const me = await User.findById(userId).select('role pass_type pass_expiry');
  let i_have_pass = false;
  if (me) {
    if (me.role === 'ADMIN' || me.role === 'PARTNER') i_have_pass = true;
    else if (me.pass_type && ['pro', 'elite', 'supreme'].includes(me.pass_type)
             && me.pass_expiry && new Date(me.pass_expiry) > new Date()) i_have_pass = true;
  }
  return {
    conversation_id: conv._id,
    other_has_pass,
    i_have_pass,
  };
};

const getUnreadCount = async (userId) => {
  const convs = await Conversation.find({ participants: userId, last_message_sender: { $ne: userId } });
  // Cheap heuristic: count conversations where the latest message is from the other side
  // and not yet read. (Exact "read_at" tracking on the conversation would require a per-user field.)
  return convs.length;
};

module.exports = {
  listConversations,
  listMessages,
  sendMessage,
  getOrCreateWithFriend,
  getUnreadCount,
  isChatEligible,
  isFriendPair,
  ensureChatEligibility,
  pairKey,
};
