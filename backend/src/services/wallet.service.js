const crypto = require('crypto');
const Wallet = require('../models/wallet.model');
const Transaction = require('../models/transaction.model');
const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const UserSession = require('../models/user-session.model');
const { encrypt, decrypt } = require('../utils/encryption');
const emailService = require('./email.service');
const { broadcastToUser } = require('../utils/sse');
const spendAnalyticsService = require('./user-spend-analytics.service');

const formatWallet = (wallet) => {
  if (!wallet) return null;
  const walletObj = wallet.toObject ? wallet.toObject() : wallet;

  const safeDecryptNumber = (val) => {
    const decrypted = decrypt(val);
    return isNaN(Number(decrypted)) ? 0 : Number(decrypted);
  };

  return {
    ...walletObj,
    wallet_account_no: decrypt(walletObj.wallet_account_no),
    available_balance: safeDecryptNumber(walletObj.available_balance),
    locked_balance: safeDecryptNumber(walletObj.locked_balance),
    withdrawable_balance: safeDecryptNumber(walletObj.withdrawable_balance),
  };
};

const createWallet = async (userId, walletPassword) => {
  const randomDigits = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
  const walletAccountNo = '1' + randomDigits;

  const salt = await bcrypt.genSalt(10);
  const walletPinHash = await bcrypt.hash(walletPassword, salt);

  const encryptedDetails = {
    user_id: userId,
    wallet_account_no: encrypt(walletAccountNo),
    wallet_account_no_hash: crypto.createHash('sha256').update(walletAccountNo).digest('hex'),
    wallet_pin_hash: walletPinHash,
    available_balance: encrypt('0'),
    locked_balance: encrypt('0'),
    withdrawable_balance: encrypt('0'),
  };

  const wallet = await Wallet.create(encryptedDetails);

  await User.findByIdAndUpdate(userId, { is_wallet_initialized: true });
  await spendAnalyticsService.initializeAnalytics(userId);

  return formatWallet(wallet);
};

const getBalance = async (userId) => {
  const wallet = await Wallet.findOne({ user_id: userId });
  return formatWallet(wallet);
};

const lockFunds = async (userId, amount, matchId = null) => {
  const wallet = await Wallet.findOne({ user_id: userId });
  if (!wallet) throw new Error('Wallet not found');

  let currentAvailable = Number(decrypt(wallet.available_balance));
  let currentLocked = Number(decrypt(wallet.locked_balance));

  if (currentAvailable < amount) throw new Error('Insufficient funds');

  currentAvailable -= amount;
  currentLocked += amount;

  wallet.available_balance = encrypt(currentAvailable.toString());
  wallet.locked_balance = encrypt(currentLocked.toString());
  await wallet.save();

  await Transaction.create({
    user_id: userId,
    amount,
    type: 'LOCK',
    category: 'GAME',
    match_id: matchId,
    status: 'SUCCESS',
    description: `Locked entry fee for match join`,
  });

  const formatted = formatWallet(wallet);
  broadcastToUser(userId, {
    type: 'WALLET_UPDATE',
    action: 'lock',
    balance: {
      available: formatted.available_balance,
      locked: formatted.locked_balance,
      withdrawable: formatted.withdrawable_balance,
    },
  });

  return formatted;
};

const unlockFunds = async (userId, amount, matchId = null, reason = 'Join expired') => {
  const wallet = await Wallet.findOne({ user_id: userId });
  if (!wallet) throw new Error('Wallet not found');

  let currentAvailable = Number(decrypt(wallet.available_balance));
  let currentLocked = Number(decrypt(wallet.locked_balance));

  if (currentLocked < amount) throw new Error('Insufficient locked funds');

  currentLocked -= amount;
  currentAvailable += amount;

  wallet.available_balance = encrypt(currentAvailable.toString());
  wallet.locked_balance = encrypt(currentLocked.toString());
  await wallet.save();

  await Transaction.create({
    user_id: userId,
    amount,
    type: 'UNLOCK',
    category: 'GAME',
    match_id: matchId,
    status: 'SUCCESS',
    description: `Unlock funds: ${reason}`,
  });

  const formatted = formatWallet(wallet);
  broadcastToUser(userId, {
    type: 'WALLET_UPDATE',
    action: 'unlock',
    balance: {
      available: formatted.available_balance,
      locked: formatted.locked_balance,
      withdrawable: formatted.withdrawable_balance,
    },
  });

  return formatted;
};

const deposit = async (userId, amount, orderId = null, paymentId = null) => {
  const wallet = await Wallet.findOne({ user_id: userId });
  if (!wallet) throw new Error('Wallet not found');

  let currentAvailable = Number(decrypt(wallet.available_balance));
  currentAvailable += Number(amount);

  wallet.available_balance = encrypt(currentAvailable.toString());
  await wallet.save();

  await Transaction.create({
    user_id: userId,
    amount: Number(amount),
    type: 'DEPOSIT',
    category: 'WALLET',
    status: 'SUCCESS',
    order_id: orderId,
    payment_id: paymentId,
    description: 'Cash added to wallet',
  });

  await spendAnalyticsService.updateOnTransaction(userId, {
    type: 'DEPOSIT',
    amount: Number(amount),
  });

  const formatted = formatWallet(wallet);
  broadcastToUser(userId, {
    type: 'WALLET_UPDATE',
    action: 'deposit',
    balance: {
      available: formatted.available_balance,
      locked: formatted.locked_balance,
      withdrawable: formatted.withdrawable_balance,
    },
  });

  return formatted;
};

const withdraw = async (userId, amount, method, details) => {
  const wallet = await Wallet.findOne({ user_id: userId });
  if (!wallet) throw new Error('Wallet not found');

  let currentWithdrawable = Number(decrypt(wallet.withdrawable_balance));
  let currentAvailable = Number(decrypt(wallet.available_balance));

  if (currentWithdrawable < amount) throw new Error('Insufficient withdrawable funds');

  currentWithdrawable -= Number(amount);
  currentAvailable -= Number(amount);

  wallet.withdrawable_balance = encrypt(currentWithdrawable.toString());
  wallet.available_balance = encrypt(currentAvailable.toString());
  await wallet.save();

  await Transaction.create({
    user_id: userId,
    amount: Number(amount),
    type: 'WITHDRAW',
    category: 'WALLET',
    status: 'PENDING',
    description: `Withdrawal request via ${method}`,
    metadata: { method, details },
  });

  await spendAnalyticsService.updateOnTransaction(userId, {
    type: 'WITHDRAW',
    amount: Number(amount),
  });

  const formatted = formatWallet(wallet);
  broadcastToUser(userId, {
    type: 'WALLET_UPDATE',
    action: 'withdraw',
    balance: {
      available: formatted.available_balance,
      locked: formatted.locked_balance,
      withdrawable: formatted.withdrawable_balance,
    },
  });

  return formatted;
};

const deductEntryFee = async (userId, amount, matchId) => {
  const wallet = await Wallet.findOne({ user_id: userId });
  if (!wallet) throw new Error('Wallet not found');

  let currentLocked = Number(decrypt(wallet.locked_balance));
  if (currentLocked < amount) throw new Error('Insufficient locked funds for entry fee');

  currentLocked -= Number(amount);
  wallet.locked_balance = encrypt(currentLocked.toString());
  await wallet.save();

  await Transaction.create({
    user_id: userId,
    amount: Number(amount),
    type: 'ENTRY_FEE',
    category: 'GAME',
    match_id: matchId,
    status: 'SUCCESS',
    description: 'Match entry fee confirmed',
  });

  await spendAnalyticsService.updateOnTransaction(userId, {
    type: 'ENTRY_FEE',
    amount: Number(amount),
  });

  const formatted = formatWallet(wallet);
  broadcastToUser(userId, {
    type: 'WALLET_UPDATE',
    action: 'entry_fee',
    balance: {
      available: formatted.available_balance,
      locked: formatted.locked_balance,
      withdrawable: formatted.withdrawable_balance,
    },
  });

  return formatted;
};

const awardPrize = async (userId, amount, matchId) => {
  const wallet = await Wallet.findOne({ user_id: userId });
  if (!wallet) throw new Error('Wallet not found');

  let currentWithdrawable = Number(decrypt(wallet.withdrawable_balance));
  let currentAvailable = Number(decrypt(wallet.available_balance));

  currentWithdrawable += Number(amount);
  currentAvailable += Number(amount);

  wallet.withdrawable_balance = encrypt(currentWithdrawable.toString());
  wallet.available_balance = encrypt(currentAvailable.toString());
  await wallet.save();

  await Transaction.create({
    user_id: userId,
    amount: Number(amount),
    type: 'PRIZE_WON',
    category: 'GAME',
    match_id: matchId,
    status: 'SUCCESS',
    description: 'Prize won for match',
  });

  await spendAnalyticsService.updateOnTransaction(userId, {
    type: 'PRIZE_WON',
    amount: Number(amount),
  });

  const formatted = formatWallet(wallet);
  broadcastToUser(userId, {
    type: 'WALLET_UPDATE',
    action: 'prize_won',
    balance: {
      available: formatted.available_balance,
      locked: formatted.locked_balance,
      withdrawable: formatted.withdrawable_balance,
    },
  });

  return formatted;
};

const requestPinReset = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const OtpVerification = require('../models/otp-verification.model');
  await OtpVerification.create({
    user_id: userId,
    otp,
    purpose: 'PIN_RESET',
    expires_at: Date.now() + 10 * 60 * 1000,
  });

  await emailService.sendEmail({
    to: user.email,
    subject: 'Wallet PIN Reset OTP',
    text: `Your OTP for resetting your wallet PIN is ${otp}. It expires in 10 minutes.`,
    html: `<p>Your OTP for resetting your wallet PIN is <b>${otp}</b>. It expires in 10 minutes.</p>`,
  });

  return { message: 'OTP sent to registered email' };
};

const verifyPinOtp = async (userId, otp) => {
  const OtpVerification = require('../models/otp-verification.model');
  const otpRecord = await OtpVerification.findOne({
    user_id: userId,
    purpose: 'PIN_RESET',
    is_used: false,
    otp: String(otp).trim(),
    expires_at: { $gt: Date.now() },
  }).sort({ created_at: -1 });

  if (!otpRecord) throw new Error('Invalid or expired OTP');

  otpRecord.is_used = true;
  await otpRecord.save();

  return { success: true, otp_id: otpRecord._id };
};

const resetPin = async (userId, otp, newPin) => {
  const OtpVerification = require('../models/otp-verification.model');
  const otpRecord = await OtpVerification.findOne({
    user_id: userId,
    purpose: 'PIN_RESET',
    is_used: false,
    otp: String(otp).trim(),
    expires_at: { $gt: Date.now() },
  }).sort({ created_at: -1 });

  if (!otpRecord) throw new Error('Invalid or expired OTP');

  const wallet = await Wallet.findOne({ user_id: userId });
  if (!wallet) throw new Error('Wallet not found');

  const salt = await bcrypt.genSalt(10);
  wallet.wallet_pin_hash = await bcrypt.hash(newPin, salt);
  await wallet.save();

  otpRecord.is_used = true;
  await otpRecord.save();

  return { success: true, message: 'Wallet PIN reset successfully' };
};

const recordTransaction = async (data) => {
  return await Transaction.create(data);
};

const sendGift = async (senderId, receiverAccountNo, amount, pin) => {
  const mongoose = require('mongoose');
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const sender = await Wallet.findOne({ user_id: senderId }).session(session);
    if (!sender) throw new Error('Sender wallet not found');

    const isPinValid = await bcrypt.compare(pin, sender.wallet_pin_hash);
    if (!isPinValid) throw new Error('Invalid Wallet PIN');

    const receiverHash = crypto.createHash('sha256').update(String(receiverAccountNo)).digest('hex');
    const receiver = await Wallet.findOne({ wallet_account_no_hash: receiverHash }).session(session);
    if (!receiver) throw new Error('Receiver wallet not found');

    if (senderId.toString() === receiver.user_id.toString()) {
      throw new Error('Cannot send gift to your own wallet');
    }

    const senderSettings = sender.settings?.toObject?.() || sender.settings || {};
    const perTxnLimit = senderSettings.per_transaction_limit ?? DEFAULT_SETTINGS.per_transaction_limit;
    const dailyLimit = senderSettings.daily_send_limit ?? DEFAULT_SETTINGS.daily_send_limit;
    const requirePinAbove = senderSettings.require_pin_above ?? DEFAULT_SETTINGS.require_pin_above;
    const amt = Number(amount);

    if (perTxnLimit > 0 && amt > perTxnLimit) {
      throw new Error(`Amount exceeds per-transaction limit of ₹${perTxnLimit}`);
    }
    if (dailyLimit > 0) {
      const sentToday = await getDailySentTotal(senderId);
      if (sentToday + amt > dailyLimit) {
        throw new Error(`Daily send limit of ₹${dailyLimit} would be exceeded (already sent ₹${sentToday})`);
      }
    }
    if (requirePinAbove > 0 && amt >= requirePinAbove && !pin) {
      throw new Error(`PIN is required for transactions ≥ ₹${requirePinAbove}`);
    }

    let senderAvailable = Number(decrypt(sender.available_balance));
    if (senderAvailable < amt) throw new Error('Insufficient funds');

    senderAvailable -= amt;
    sender.available_balance = encrypt(senderAvailable.toString());

    let receiverAvailable = Number(decrypt(receiver.available_balance));
    receiverAvailable += amt;
    receiver.available_balance = encrypt(receiverAvailable.toString());

    await sender.save({ session });
    await receiver.save({ session });

    await Transaction.create([
      {
        user_id: senderId,
        amount: Number(amount),
        type: 'GIFT_SENT',
        category: 'GIFT',
        status: 'SUCCESS',
        description: `Sent gift to ${receiverAccountNo}`,
      },
      {
        user_id: receiver.user_id,
        amount: Number(amount),
        type: 'GIFT_RECEIVED',
        category: 'GIFT',
        status: 'SUCCESS',
        description: `Received gift from sender`,
      },
    ], { session, ordered: true });

    await spendAnalyticsService.updateOnTransaction(senderId, { type: 'GIFT_SENT', amount: Number(amount) }, { session });
    await spendAnalyticsService.updateOnTransaction(receiver.user_id.toString(), { type: 'GIFT_RECEIVED', amount: Number(amount) }, { session });

    await session.commitTransaction();
    session.endSession();

    const formattedSender = formatWallet(sender);
    broadcastToUser(senderId, {
      type: 'WALLET_UPDATE',
      action: 'gift_sent',
      balance: { available: formattedSender.available_balance },
    });

    const formattedReceiver = formatWallet(receiver);
    broadcastToUser(receiver.user_id.toString(), {
      type: 'WALLET_UPDATE',
      action: 'gift_received',
      balance: { available: formattedReceiver.available_balance },
    });

    return formattedSender;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const redeem = async (userId, amount) => {
  const wallet = await Wallet.findOne({ user_id: userId });
  if (!wallet) throw new Error('Wallet not found');

  let currentAvailable = Number(decrypt(wallet.available_balance));
  if (currentAvailable < amount) throw new Error('Insufficient funds for redemption');

  currentAvailable -= Number(amount);
  wallet.available_balance = encrypt(currentAvailable.toString());
  await wallet.save();

  await Transaction.create({
    user_id: userId,
    amount: Number(amount),
    type: 'REDEEM',
    category: 'WALLET',
    status: 'SUCCESS',
    description: 'Redeemed wallet balance',
  });

  const formatted = formatWallet(wallet);
  broadcastToUser(userId, {
    type: 'WALLET_UPDATE',
    action: 'redeem',
    balance: { available: formatted.available_balance },
  });

  return formatted;
};

const getTransactionHistory = async (userId, options = {}) => {
  const { from, to, type, category, status, skip = 0, limit = 50 } = options;

  const query = { user_id: userId };

  if (from || to) {
    query.createdAt = {};
    if (from) {
      const fromDate = from instanceof Date ? from : new Date(from);
      if (!isNaN(fromDate.getTime())) query.createdAt.$gte = fromDate;
    }
    if (to) {
      const toDate = to instanceof Date ? to : new Date(to);
      if (!isNaN(toDate.getTime())) query.createdAt.$lte = toDate;
    }
    if (Object.keys(query.createdAt).length === 0) delete query.createdAt;
  }

  if (type) {
    if (Array.isArray(type)) {
      query.type = { $in: type };
    } else {
      query.type = type;
    }
  }

  if (category) query.category = category;
  if (status) query.status = status;

  return await Transaction.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

const getLastDepositSource = async (userId) => {
  const lastDeposit = await Transaction.findOne({
    user_id: userId,
    type: 'DEPOSIT',
    status: 'SUCCESS',
  }).sort({ createdAt: -1 });

  if (lastDeposit) {
    return {
      source: 'Original Payment Method',
      details: lastDeposit.payment_id ? `Ref: ${lastDeposit.payment_id.slice(-4)}` : 'Linked Account',
    };
  }
  return null;
};

const DEFAULT_SETTINGS = {
  per_transaction_limit: 5000,
  daily_send_limit: 10000,
  max_wallet_balance: 100000,
  low_balance_threshold: 100,
  require_pin_above: 0,
  transaction_notifications: true,
  low_balance_alerts: true,
  auto_lock_inactive: false,
  hide_balance_by_default: false,
};

const SETTINGS_FIELDS = [
  'per_transaction_limit',
  'daily_send_limit',
  'max_wallet_balance',
  'low_balance_threshold',
  'require_pin_above',
  'transaction_notifications',
  'low_balance_alerts',
  'auto_lock_inactive',
  'hide_balance_by_default',
];

const getWalletSettings = async (userId) => {
  const wallet = await Wallet.findOne({ user_id: userId }).select('settings');
  if (!wallet) throw new Error('Wallet not found');
  return { ...DEFAULT_SETTINGS, ...(wallet.settings?.toObject?.() || wallet.settings || {}) };
};

const updateWalletSettings = async (userId, updates = {}) => {
  const wallet = await Wallet.findOne({ user_id: userId });
  if (!wallet) throw new Error('Wallet not found');

  const current = wallet.settings?.toObject?.() || wallet.settings || {};
  const merged = { ...DEFAULT_SETTINGS, ...current };

  for (const key of SETTINGS_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      const value = updates[key];
      if (['per_transaction_limit', 'daily_send_limit', 'max_wallet_balance', 'low_balance_threshold', 'require_pin_above'].includes(key)) {
        const num = Number(value);
        if (isNaN(num) || num < 0) {
          throw new Error(`Invalid value for ${key}`);
        }
        merged[key] = num;
      } else if (typeof value === 'boolean') {
        merged[key] = value;
      } else {
        merged[key] = value;
      }
    }
  }

  wallet.settings = merged;
  await wallet.save();
  return merged;
};

const getDailySentTotal = async (userId) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const agg = await Transaction.aggregate([
    {
      $match: {
        user_id: new (require('mongoose').Types.ObjectId)(String(userId)),
        type: { $in: ['GIFT_SENT', 'WITHDRAW'] },
        status: 'SUCCESS',
        createdAt: { $gte: startOfToday },
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return agg[0]?.total || 0;
};

const checkSendLimits = async (userId, amount) => {
  const wallet = await Wallet.findOne({ user_id: userId }).select('settings');
  if (!wallet) throw new Error('Wallet not found');
  const settings = { ...DEFAULT_SETTINGS, ...(wallet.settings?.toObject?.() || wallet.settings || {}) };
  const amt = Number(amount);
  if (isNaN(amt) || amt <= 0) throw new Error('Invalid amount');

  if (settings.per_transaction_limit > 0 && amt > settings.per_transaction_limit) {
    throw new Error(`Amount exceeds per-transaction limit of ₹${settings.per_transaction_limit}`);
  }

  if (settings.daily_send_limit > 0) {
    const sentToday = await getDailySentTotal(userId);
    if (sentToday + amt > settings.daily_send_limit) {
      throw new Error(`Daily send limit of ₹${settings.daily_send_limit} would be exceeded (already sent ₹${sentToday})`);
    }
  }
};

const getWalletOwner = async (accountNo) => {
  const accountHash = crypto.createHash('sha256').update(String(accountNo)).digest('hex');

  let wallet = await Wallet.findOne({ wallet_account_no_hash: accountHash });

  if (!wallet) {
    await migrateWalletHashes();
    wallet = await Wallet.findOne({ wallet_account_no_hash: accountHash });
  }

  if (!wallet) return null;

  const user = await User.findById(wallet.user_id);
  if (!user) return null;

  return {
    username: user.username,
    is_verified: true,
  };
};

const migrateWalletHashes = async () => {
  const wallets = await Wallet.find({ wallet_account_no_hash: { $exists: false } });
  for (const w of wallets) {
    try {
      const declaredAccountNo = decrypt(w.wallet_account_no);
      if (declaredAccountNo) {
        w.wallet_account_no_hash = crypto.createHash('sha256').update(String(declaredAccountNo)).digest('hex');
        await w.save();
      }
    } catch (e) {
      console.error('Failed to migrate wallet', w._id, e);
    }
  }
};

module.exports = {
  createWallet,
  getBalance,
  lockFunds,
  unlockFunds,
  deposit,
  withdraw,
  deductEntryFee,
  awardPrize,
  requestPinReset,
  verifyPinOtp,
  resetPin,
  sendGift,
  redeem,
  getTransactionHistory,
  getLastDepositSource,
  recordTransaction,
  getWalletOwner,
  migrateWalletHashes,
  getWalletSettings,
  updateWalletSettings,
  getDailySentTotal,
  checkSendLimits,
  DEFAULT_SETTINGS,
};
