const UserSpendAnalytics = require('../models/user-spend-analytics.model');
const User = require('../models/user.model');
const UserProfile = require('../models/user-profile.model');
const Wallet = require('../models/wallet.model');
const UserPass = require('../models/user-pass.model');
const Transaction = require('../models/transaction.model');
const Payment = require('../models/payment.model');
const { broadcastToUser } = require('../utils/sse');

const initializeAnalytics = async (userId, options = {}) => {
  const existing = await UserSpendAnalytics.findOne({ user_id: userId }).session(options.session || null);
  if (existing) return existing;

  const analytics = new UserSpendAnalytics({ user_id: userId });
  await analytics.save(options);
  return analytics;
};

const updateOnTransaction = async (userId, transaction, options = {}) => {
  let analytics = await UserSpendAnalytics.findOne({ user_id: userId }).session(options.session || null);
  if (!analytics) {
    analytics = await initializeAnalytics(userId, options);
  }

  const updates = { last_transaction_at: new Date() };

  switch (transaction.type) {
    case 'ENTRY_FEE':
      updates.total_spent_on_events = (analytics.total_spent_on_events || 0) + transaction.amount;
      updates.events_joined = (analytics.events_joined || 0) + 1;
      break;
    case 'DEPOSIT':
      updates.total_deposited = (analytics.total_deposited || 0) + transaction.amount;
      break;
    case 'WITHDRAW':
      updates.total_withdrawn = (analytics.total_withdrawn || 0) + transaction.amount;
      break;
    case 'PRIZE_WON':
      updates.total_prize_won = (analytics.total_prize_won || 0) + transaction.amount;
      break;
    case 'GIFT_SENT':
      updates.total_gifts_sent = (analytics.total_gifts_sent || 0) + transaction.amount;
      break;
    case 'GIFT_RECEIVED':
      updates.total_gifts_received = (analytics.total_gifts_received || 0) + transaction.amount;
      break;
  }

  updates.net_balance =
    (updates.total_deposited || analytics.total_deposited || 0) +
    (updates.total_prize_won || analytics.total_prize_won || 0) +
    (updates.total_gifts_received || analytics.total_gifts_received || 0) -
    (updates.total_spent_on_events || analytics.total_spent_on_events || 0) -
    (updates.total_spent_on_passes || analytics.total_spent_on_passes || 0) -
    (updates.total_withdrawn || analytics.total_withdrawn || 0) -
    (updates.total_gifts_sent || analytics.total_gifts_sent || 0);

  await UserSpendAnalytics.findByIdAndUpdate(analytics._id, { $set: updates }, options);

  broadcastToUser(userId, {
    type: 'SPEND_UPDATE',
    data: updates,
  });

  return updates;
};

const updateOnPassPurchase = async (userId, amount) => {
  let analytics = await UserSpendAnalytics.findOne({ user_id: userId });
  if (!analytics) analytics = await initializeAnalytics(userId);

  const updates = {
    total_spent_on_passes: (analytics.total_spent_on_passes || 0) + amount,
    passes_purchased: (analytics.passes_purchased || 0) + 1,
    last_transaction_at: new Date(),
  };

  updates.net_balance =
    (analytics.total_deposited || 0) +
    (analytics.total_prize_won || 0) +
    (analytics.total_gifts_received || 0) -
    (analytics.total_spent_on_events || 0) -
    updates.total_spent_on_passes -
    (analytics.total_withdrawn || 0) -
    (analytics.total_gifts_sent || 0);

  await UserSpendAnalytics.findByIdAndUpdate(analytics._id, { $set: updates });

  return updates;
};

const updateOnEventCreated = async (userId) => {
  let analytics = await UserSpendAnalytics.findOne({ user_id: userId });
  if (!analytics) analytics = await initializeAnalytics(userId);

  await UserSpendAnalytics.findByIdAndUpdate(analytics._id, {
    $inc: { events_created: 1 },
    $set: { last_transaction_at: new Date() },
  });
};

const getUserAnalytics = async (userId) => {
  const analytics = await UserSpendAnalytics.findOne({ user_id: userId });
  if (!analytics) return await initializeAnalytics(userId);
  return analytics;
};

const getAdminUserFinancialProfile = async (userId) => {
  const user = await User.findById(userId).select('username email role is_verified account_status created_at');
  if (!user) throw new Error('User not found');

  const profile = await UserProfile.findOne({ user_id: userId });
  const wallet = await Wallet.findOne({ user_id: userId });
  const analytics = await UserSpendAnalytics.findOne({ user_id: userId });
  const passes = await UserPass.find({ user_id: userId }).sort({ activated_at: -1 });
  const transactions = await Transaction.find({ user_id: userId }).sort({ createdAt: -1 }).limit(20);
  const payments = await Payment.find({ user_id: userId }).sort({ createdAt: -1 }).limit(20);

  const { decrypt } = require('../utils/encryption');
  const safeDecrypt = (val) => {
    try { return isNaN(Number(decrypt(val))) ? 0 : Number(decrypt(val)); }
    catch { return 0; }
  };

  return {
    user,
    profile,
    wallet: wallet ? {
      account_no: decrypt(wallet.wallet_account_no),
      available_balance: safeDecrypt(wallet.available_balance),
      locked_balance: safeDecrypt(wallet.locked_balance),
      withdrawable_balance: safeDecrypt(wallet.withdrawable_balance),
    } : null,
    analytics,
    active_pass: passes.find(p => p.status === 'ACTIVE' && p.expires_at > new Date()) || null,
    pass_history: passes,
    recent_transactions: transactions,
    recent_payments: payments,
  };
};

const getAdminAllUsersSpending = async (pagination = { skip: 0, limit: 20 }) => {
  const analytics = await UserSpendAnalytics.find()
    .sort({ total_spent_on_events: -1 })
    .skip(pagination.skip)
    .limit(pagination.limit);

  const userIds = analytics.map(a => a.user_id);
  const users = await User.find({ _id: { $in: userIds } }).select('username email role');

  const userMap = {};
  users.forEach(u => { userMap[u._id.toString()] = u; });

  return analytics.map(a => ({
    ...a.toObject(),
    username: userMap[a.user_id.toString()]?.username || 'Unknown',
    email: userMap[a.user_id.toString()]?.email || 'Unknown',
    role: userMap[a.user_id.toString()]?.role || 'USER',
  }));
};

const getSystemRevenueReport = async () => {
  const totalDeposits = await Transaction.aggregate([
    { $match: { type: 'DEPOSIT', status: 'SUCCESS' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  const totalWithdrawals = await Transaction.aggregate([
    { $match: { type: 'WITHDRAW', status: 'SUCCESS' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  const totalEntryFees = await Transaction.aggregate([
    { $match: { type: 'ENTRY_FEE', status: 'SUCCESS' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  const totalPrizes = await Transaction.aggregate([
    { $match: { type: 'PRIZE_WON', status: 'SUCCESS' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  const totalPassRevenue = await UserSpendAnalytics.aggregate([
    { $group: { _id: null, total: { $sum: '$total_spent_on_passes' } } },
  ]);

  return {
    total_deposits: totalDeposits[0]?.total || 0,
    total_withdrawals: totalWithdrawals[0]?.total || 0,
    total_entry_fees: totalEntryFees[0]?.total || 0,
    total_prizes_distributed: totalPrizes[0]?.total || 0,
    total_pass_revenue: totalPassRevenue[0]?.total || 0,
    platform_revenue: (totalEntryFees[0]?.total || 0) + (totalPassRevenue[0]?.total || 0) - (totalPrizes[0]?.total || 0),
  };
};

module.exports = {
  initializeAnalytics,
  updateOnTransaction,
  updateOnPassPurchase,
  updateOnEventCreated,
  getUserAnalytics,
  getAdminUserFinancialProfile,
  getAdminAllUsersSpending,
  getSystemRevenueReport,
};
