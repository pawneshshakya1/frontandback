const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Payment = require('../models/payment.model');
const Match = require('../models/match.model');
const User = require('../models/user.model');
const walletService = require('../services/wallet.service');
const paymentService = require('../services/payment.service');
const notificationService = require('../services/notification.service');
const { broadcastToUser } = require('../utils/sse');
const { webhookLimiter } = require('../middlewares/rateLimit.middleware');

const CASHFREE_WEBHOOK_SECRET = process.env.CASHFREE_WEBHOOK_SECRET || '';

const verifyWebhookSignature = (rawBody, signature) => {
  if (!CASHFREE_WEBHOOK_SECRET) {
    console.error('CRITICAL: CASHFREE_WEBHOOK_SECRET not set — webhook rejected (fail-closed)');
    return false;
  }
  if (!signature || !rawBody) return false;
  const expectedSignature = crypto
    .createHmac('sha256', CASHFREE_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expectedSignature, 'hex'), Buffer.from(String(signature), 'hex'));
  } catch (e) {
    return false;
  }
};

router.post('/cashfree', webhookLimiter, async (req, res) => {
  try {
    const signature = req.headers['x-webhook-signature'];
    const body = req.body;
    const rawBody = req.rawBody;
    const ip = req.ip;

    const signatureValid = verifyWebhookSignature(rawBody, signature);
    if (!signatureValid) {
      console.warn('Webhook signature verification failed', { ip, hasSignature: !!signature });
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    const { order_id } = body.data || body;
    const eventType = body.type || body.data?.payment_status || 'UNKNOWN';

    const CashfreeWebhookLog = require('../models/cashfree-webhook-log.model');
    const existingLog = await CashfreeWebhookLog.findOne({
      order_id,
      event_type: eventType,
      status: 'PROCESSED',
    });
    if (existingLog) {
      return res.json({ success: true, message: 'Duplicate webhook ignored' });
    }

    const webhookResult = await paymentService.processWebhook(body, ip);
    webhookResult.signature_verified = signatureValid;

    if (webhookResult.duplicate) {
      return res.json({ success: true, message: 'Duplicate webhook ignored' });
    }

    if (!webhookResult.success) {
      return res.status(400).json({ success: false, message: webhookResult.error });
    }

    const payment = await Payment.findOne({ order_id });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    if (payment.webhook_received) {
      return res.json({ success: true, message: 'Already processed' });
    }

    payment.webhook_received = true;
    payment.webhook_received_at = new Date();
    payment.webhook_payload = body;
    payment.payment_id = body.data?.payment_id || body.payment_id;
    await payment.save();

    const user = await User.findById(payment.user_id);

    if (body.data?.payment_status === 'SUCCESS' || webhookResult.verification?.success) {
      payment.status = 'SUCCESS';
      await payment.save();

      if (payment.type === 'DEPOSIT') {
        await walletService.deposit(payment.user_id, payment.amount, payment.order_id, payment.payment_id);
      } else if (payment.type === 'ENTRY_FEE' && payment.match_id) {
        const match = await Match.findById(payment.match_id);
        if (match) {
          const alreadyJoined = match.participants.some(p => p.user_id.toString() === payment.user_id.toString());
          if (!alreadyJoined) {
            match.participants.push({ user_id: payment.user_id, joined_at: new Date() });
            await match.save();

            const UserStats = require('../models/user-stats.model');
            let stats = await UserStats.findOne({ user_id: payment.user_id });
            if (!stats) stats = await UserStats.create({ user_id: payment.user_id });
            stats.total_matches_played = (stats.total_matches_played || 0) + 1;
            await stats.save();
          }
        }
      }

      await notificationService.sendPaymentNotification(
        payment.user_id.toString(), payment.order_id, 'SUCCESS', payment.amount
      );

      broadcastToUser(payment.user_id.toString(), {
        type: 'PAYMENT_UPDATE',
        data: { orderId: payment.order_id, status: 'SUCCESS', amount: payment.amount },
      });

    } else if (body.data?.payment_status === 'FAILED') {
      payment.status = 'FAILED';
      await payment.save();

      if (payment.type === 'ENTRY_FEE') {
        try {
          await walletService.unlockFunds(payment.user_id, payment.amount, payment.match_id, 'Payment failed');
        } catch (err) {
          console.error('Unlock funds error:', err.message);
        }
      }

      await notificationService.sendPaymentNotification(
        payment.user_id.toString(), payment.order_id, 'FAILED', payment.amount
      );

      broadcastToUser(payment.user_id.toString(), {
        type: 'PAYMENT_UPDATE',
        data: { orderId: payment.order_id, status: 'FAILED', amount: payment.amount },
      });
    }

    res.json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
