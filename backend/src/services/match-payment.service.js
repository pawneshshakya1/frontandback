// Match payment service — join / leave / cashfree / wallet flows.
// All wallet / payment-service / payment-model interactions live
// here so the lifecycle service can stay focused on match state.

const Match = require('../models/match.model');
const User = require('../models/user.model');
const Friend = require('../models/friend.model');
const walletService = require('./wallet.service');
const { broadcast, broadcastToUser } = require('../utils/sse');

// Returns true if `viewerId` is an ACCEPTED friend of the match creator.
const _isFriendOfCreator = async (viewerId, creatorId) => {
  if (viewerId.toString() === creatorId.toString()) return true;
  const f = await Friend.findOne({
    status: 'ACCEPTED',
    $or: [
      { user_id: creatorId, friend_id: viewerId },
      { user_id: viewerId, friend_id: creatorId },
    ],
  });
  return !!f;
};

const _bumpUserStats = async (userId) => {
  const UserStats = require('../models/user-stats.model');
  let stats = await UserStats.findOne({ user_id: userId });
  if (!stats) stats = await UserStats.create({ user_id: userId });
  stats.total_matches_played = (stats.total_matches_played || 0) + 1;
  await stats.save();
};

const _emitJoinEvents = (match, userId) => {
  broadcast({ type: 'MATCH_UPDATE', action: 'join', matchId: match._id.toString(), participants: match.participants.length });
  broadcastToUser(userId, { type: 'PARTICIPANT_UPDATE', matchId: match._id.toString(), count: match.participants.length });
  broadcastToUser(userId, { type: 'PARTICIPANT_JOIN', matchId: match._id.toString(), user: { id: userId } });

  const creatorId = match.created_by.toString();
  if (creatorId !== userId) {
    broadcastToUser(creatorId, {
      type: 'PARTICIPANT_JOIN',
      matchId: match._id.toString(),
      count: match.participants.length,
      participant: { user_id: userId },
    });
  }
};

const joinMatch = async (userId, roomId, paymentMethod = 'WALLET') => {
  const match = await Match.findOne({ room_id: roomId });
  if (!match) throw new Error('Match not found');

  if (!match.isPublished) throw new Error('Match is not published');
  if (match.status !== 'OPEN') throw new Error('Match is not open');
  if (match.participants.length >= match.max_players) throw new Error('Match is full');

  if (match.is_friend_only) {
    const allowed = await _isFriendOfCreator(userId, match.created_by);
    if (!allowed) throw new Error('This event is friends-only');
  }

  const isJoined = match.participants.some(p => p.user_id.toString() === userId.toString());
  if (isJoined) throw new Error('Already joined');

  if (paymentMethod === 'WALLET') {
    await walletService.lockFunds(userId, match.entry_fee, match._id);
  }

  match.participants.push({ user_id: userId });
  await match.save();

  await _bumpUserStats(userId);
  _emitJoinEvents(match, userId);

  return match;
};

const joinMatchById = async (userId, matchId, paymentMethod = 'WALLET') => {
  const match = await Match.findById(matchId);
  if (!match) throw new Error('Match not found');

  if (!match.isPublished) throw new Error('Match is not published');
  if (match.status !== 'OPEN') throw new Error('Match is not open');
  if (match.participants.length >= match.max_players) throw new Error('Match is full');

  if (match.created_by.toString() === userId.toString()) {
    throw new Error('You cannot join your own event');
  }

  if (match.is_friend_only) {
    const allowed = await _isFriendOfCreator(userId, match.created_by);
    if (!allowed) throw new Error('This event is friends-only');
  }

  const isJoined = match.participants.some(p => p.user_id.toString() === userId.toString());
  if (isJoined) throw new Error('Already joined');

  if (paymentMethod === 'WALLET') {
    await walletService.lockFunds(userId, match.entry_fee, match._id);
  }

  match.participants.push({ user_id: userId });
  await match.save();

  await _bumpUserStats(userId);
  _emitJoinEvents(match, userId);

  return match;
};

const leaveMatch = async (userId, roomId) => {
  const match = await Match.findOne({ room_id: roomId });
  if (!match) throw new Error('Match not found');

  const participantIndex = match.participants.findIndex(p => p.user_id.toString() === userId.toString());
  if (participantIndex === -1) throw new Error('Not joined');

  if (match.status !== 'OPEN') throw new Error('Match is not open');

  match.participants.splice(participantIndex, 1);
  await match.save();

  broadcast({ type: 'MATCH_UPDATE', action: 'leave', matchId: match._id.toString(), participants: match.participants.length });
  broadcastToUser(userId, { type: 'PARTICIPANT_UPDATE', matchId: match._id.toString(), count: match.participants.length });

  const creatorId = match.created_by.toString();
  broadcastToUser(creatorId, {
    type: 'PARTICIPANT_LEAVE',
    matchId: match._id.toString(),
    count: match.participants.length,
  });

  return match;
};

const initiateMatchPayment = async (userId, matchId, paymentMethod, cashfreeDetails) => {
  const match = await Match.findById(matchId);
  if (!match) throw new Error('Match not found');

  if (!match.isPublished) throw new Error('Match is not published');
  if (match.status !== 'OPEN') throw new Error('Match is not open');
  if (match.participants.length >= match.max_players) throw new Error('Match is full');

  const isJoined = match.participants.some(p => p.user_id.toString() === userId.toString());
  if (isJoined) throw new Error('Already joined');

  if (paymentMethod === 'WALLET') {
    const wallet = await walletService.getBalance(userId);
    if (!wallet || wallet.available_balance < match.entry_fee) throw new Error('Insufficient wallet balance');

    await walletService.lockFunds(userId, match.entry_fee, matchId);

    match.participants.push({ user_id: userId });
    await match.save();

    await _bumpUserStats(userId);

    broadcast({ type: 'MATCH_UPDATE', action: 'join', matchId: match._id.toString(), participants: match.participants.length });
    const creatorId = match.created_by.toString();
    broadcastToUser(creatorId, {
      type: 'PARTICIPANT_JOIN',
      matchId: match._id.toString(),
      count: match.participants.length,
      participant: { user_id: userId },
    });
    return { success: true, method: 'WALLET', match };
  }

  if (paymentMethod === 'CASHFREE') {
    const paymentService = require('./payment.service');
    const Payment = require('../models/payment.model');
    const user = await User.findById(userId);

    const orderData = await paymentService.createOrder(
      userId, match.entry_fee,
      cashfreeDetails?.phone || user?.phone || '9999999999',
      cashfreeDetails?.email || user?.email || 'test@example.com'
    );

    await walletService.lockFunds(userId, match.entry_fee, matchId);

    await Payment.create({
      user_id: userId, order_id: orderData.order_id, amount: match.entry_fee,
      method: 'CASHFREE_UPI', status: 'PENDING', type: 'ENTRY_FEE', match_id: matchId,
      metadata: { customer_phone: user?.phone, customer_email: user?.email },
    });

    return {
      success: true, method: 'CASHFREE',
      order_id: orderData.order_id,
      payment_session_url: orderData.payment_session_url,
      payment_token: orderData.payment_token,
    };
  }

  throw new Error('Invalid payment method');
};

const confirmCashfreeJoin = async (userId, matchId, orderId) => {
  const Payment = require('../models/payment.model');
  const paymentService = require('./payment.service');

  const payment = await Payment.findOne({ order_id: orderId, user_id: userId });
  if (!payment) throw new Error('Payment not found');

  if (payment.status === 'SUCCESS') {
    const match = await Match.findById(matchId);
    if (!match) throw new Error('Match not found');

    const isJoined = match.participants.some(p => p.user_id.toString() === userId.toString());
    if (isJoined) return { success: true, message: 'Already joined', match };

    match.participants.push({ user_id: userId });
    await match.save();

    broadcast({ type: 'MATCH_UPDATE', action: 'join', matchId: match._id.toString(), participants: match.participants.length });
    broadcastToUser(match.created_by.toString(), {
      type: 'PARTICIPANT_JOIN',
      matchId: match._id.toString(),
      count: match.participants.length,
      participant: { user_id: userId },
    });
    return { success: true, match };
  }

  const verification = await paymentService.verifyOrder(orderId);

  if (verification.success) {
    payment.status = 'SUCCESS';
    payment.payment_id = verification.payment_id;
    payment.cashfree_response = verification;
    await payment.save();

    const match = await Match.findById(matchId);
    if (!match) throw new Error('Match not found');

    const isJoined = match.participants.some(p => p.user_id.toString() === userId.toString());
    if (!isJoined) {
      match.participants.push({ user_id: userId });
      await match.save();

      broadcast({ type: 'MATCH_UPDATE', action: 'join', matchId: match._id.toString(), participants: match.participants.length });
      broadcastToUser(match.created_by.toString(), {
        type: 'PARTICIPANT_JOIN',
        matchId: match._id.toString(),
        count: match.participants.length,
        participant: { user_id: userId },
      });
    }

    broadcastToUser(userId, {
      type: 'PAYMENT_UPDATE',
      data: { orderId, status: 'SUCCESS', amount: payment.amount },
    });

    return { success: true, match };
  } else {
    payment.status = 'FAILED';
    await payment.save();
    const match = await Match.findById(matchId);
    await walletService.unlockFunds(userId, match.entry_fee, matchId, 'Payment failed');

    broadcastToUser(userId, {
      type: 'PAYMENT_UPDATE',
      data: { orderId, status: 'FAILED', amount: payment.amount },
    });

    return { success: false, message: 'Payment failed' };
  }
};

module.exports = {
  joinMatch,
  joinMatchById,
  leaveMatch,
  initiateMatchPayment,
  confirmCashfreeJoin,
};
