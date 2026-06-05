const Payment = require('../models/payment.model');
const Transaction = require('../models/transaction.model');
const walletService = require('../services/wallet.service');
const paymentService = require('../services/payment.service');
const notificationService = require('../services/notification.service');
const { broadcastToUser } = require('../utils/sse');
const STATUS_CODES = require('../utils/statusCodes');

const initiateCashfreePayment = async (req, res) => {
  try {
    const { amount, type, matchId } = req.body;

    if (!amount || amount < 1) {
      return res.sendError(new Error('Invalid amount'), 'Invalid amount', STATUS_CODES.BAD_REQUEST);
    }

    const user = await require('../models/user.model').findById(req.userId);
    if (!user) {
      return res.sendError(new Error('User not found'), 'User not found', STATUS_CODES.NOT_FOUND);
    }

    const orderData = await paymentService.createOrder(
      req.userId, amount,
      user.phone || '9999999999',
      user.email || 'test@example.com'
    );

    const payment = await Payment.create({
      user_id: req.userId,
      order_id: orderData.order_id,
      amount,
      method: 'CASHFREE_UPI',
      status: 'PENDING',
      type: type || 'DEPOSIT',
      match_id: matchId || null,
      customer_phone: user.phone,
      customer_email: user.email,
    });

    res.sendSuccess({
      payment_id: payment._id,
      order_id: orderData.order_id,
      payment_session_url: orderData.payment_session_url,
      payment_token: orderData.payment_token,
    }, 'Payment initiated', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.sendError(new Error('Order ID required'), 'Order ID required', STATUS_CODES.BAD_REQUEST);
    }

    const verification = await paymentService.verifyOrder(orderId);

    // B5 fix: use atomic findOneAndUpdate with a status guard so two
    // concurrent verify calls cannot both transition PENDING -> SUCCESS
    // and double-credit the wallet.
    const updated = await Payment.findOneAndUpdate(
      { order_id: orderId, status: 'PENDING' },
      verification.success
        ? {
            $set: {
              status: 'SUCCESS',
              payment_id: verification.payment_id,
              cashfree_response: verification,
            },
          }
        : { $set: { status: 'FAILED' } },
      { new: true }
    );

    if (!updated) {
      // Either the payment is already in a terminal state, or the
      // order_id is unknown. Fetch and return the current state so
      // the caller can reconcile.
      const existing = await Payment.findOne({ order_id: orderId });
      if (!existing) {
        return res.sendError(new Error('Payment record not found'), 'Payment record not found', STATUS_CODES.NOT_FOUND);
      }
      return res.sendSuccess(existing, `Payment already ${existing.status.toLowerCase()}`, STATUS_CODES.OK);
    }

    if (verification.success) {
      if (updated.type === 'DEPOSIT') {
        await walletService.deposit(updated.user_id, updated.amount, updated.order_id, updated.payment_id);
      }

      await notificationService.sendPaymentNotification(
        updated.user_id.toString(), orderId, 'SUCCESS', updated.amount
      );

      broadcastToUser(updated.user_id.toString(), {
        type: 'PAYMENT_UPDATE',
        data: { orderId, status: 'SUCCESS', amount: updated.amount },
      });

      return res.sendSuccess(updated, 'Payment verified', STATUS_CODES.OK);
    }

    await notificationService.sendPaymentNotification(
      updated.user_id.toString(), orderId, 'FAILED', updated.amount
    );

    return res.sendSuccess(updated, 'Payment verification failed', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const getPaymentHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status } = req.query;
    const query = { user_id: req.userId };

    if (type) query.type = type;
    if (status) query.status = status;

    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payment.countDocuments(query);

    res.sendSuccess({
      payments,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
    }, 'Payment history retrieved', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.sendError(new Error('Payment not found'), 'Payment not found', STATUS_CODES.NOT_FOUND);
    }
    res.sendSuccess(payment, 'Payment retrieved', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const getAdminPayments = async (req, res) => {
  try {
    const { status, type, userId, startDate, endDate, page = 1, limit = 50 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (type) query.type = type;
    if (userId) query.user_id = userId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const payments = await Payment.find(query)
      .populate('user_id', 'username email')
      .populate('match_id', 'title')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payment.countDocuments(query);

    res.sendSuccess({
      payments,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
    }, 'Payments retrieved', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const getPaymentStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const [
      totalRevenue, todayRevenue, weekRevenue, monthRevenue,
      walletDeposits, cashfreePayments, pendingWithdrawals,
      successCount, failedCount, totalCount,
    ] = await Promise.all([
      Payment.aggregate([{ $match: { status: 'SUCCESS', type: 'DEPOSIT' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Payment.aggregate([{ $match: { status: 'SUCCESS', type: 'DEPOSIT', createdAt: { $gte: today } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Payment.aggregate([{ $match: { status: 'SUCCESS', type: 'DEPOSIT', createdAt: { $gte: weekAgo } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Payment.aggregate([{ $match: { status: 'SUCCESS', type: 'DEPOSIT', createdAt: { $gte: monthAgo } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Payment.countDocuments({ method: 'WALLET', status: 'SUCCESS' }),
      Payment.countDocuments({ method: { $regex: 'CASHFREE' }, status: 'SUCCESS' }),
      Transaction.aggregate([{ $match: { type: 'WITHDRAW', status: 'PENDING' } }, { $group: { _id: null, count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } }]),
      Payment.countDocuments({ status: 'SUCCESS' }),
      Payment.countDocuments({ status: 'FAILED' }),
      Payment.countDocuments(),
    ]);

    const successRate = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0;

    const methodBreakdown = await Payment.aggregate([
      { $match: { status: 'SUCCESS' } },
      { $group: { _id: '$method', count: { $sum: 1 }, total: { $sum: '$amount' } } },
    ]);

    res.sendSuccess({
      totalRevenue: totalRevenue[0]?.total || 0,
      todayRevenue: todayRevenue[0]?.total || 0,
      weekRevenue: weekRevenue[0]?.total || 0,
      monthRevenue: monthRevenue[0]?.total || 0,
      walletDeposits,
      cashfreePayments,
      pendingWithdrawals: { count: pendingWithdrawals[0]?.count || 0, totalAmount: pendingWithdrawals[0]?.totalAmount || 0 },
      successRate,
      failedPayments: failedCount,
      methodBreakdown,
    }, 'Payment stats retrieved', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

module.exports = {
  initiateCashfreePayment,
  verifyPayment,
  getPaymentHistory,
  getPaymentById,
  getAdminPayments,
  getPaymentStats,
};
