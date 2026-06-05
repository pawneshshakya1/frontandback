const { CFEnvironment } = require('cashfree-pg');
const axios = require('axios');
const CashfreeWebhookLog = require('../models/cashfree-webhook-log.model');

const XClientId = process.env.CASHFREE_APP_ID?.trim();
const XClientSecret = process.env.CASHFREE_SECRET_KEY?.trim();
const XEnvironment = CFEnvironment.SANDBOX;

const CASHFREE_BASE_URL = 'https://sandbox.cashfree.com/pg';

const createOrder = async (userId, amount, customerPhone, customerEmail) => {
  try {
    const uniqueOrderId = `ORDER_${userId}_${Date.now()}`;

    const requestBody = {
      order_amount: amount,
      order_currency: 'INR',
      order_id: uniqueOrderId,
      customer_details: {
        customer_id: userId.toString(),
        customer_phone: customerPhone || '9999999999',
        customer_email: customerEmail || 'test@example.com',
      },
      order_meta: { return_url: 'https://battlecore.app/payment-return' },
    };

    const response = await axios.post(`${CASHFREE_BASE_URL}/orders`, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': XClientId,
        'x-client-secret': XClientSecret,
        'x-environment': XEnvironment === CFEnvironment.PRODUCTION ? 'PRODUCTION' : 'SANDBOX',
        'x-api-version': '2025-01-01',
      },
    });

    return response.data;
  } catch (error) {
    console.error('=== Cashfree ERROR ===');
    console.error('Status:', error.response?.status);
    console.error('Response:', JSON.stringify(error.response?.data));
    throw new Error(error.response?.data?.message || 'Failed to initiate payment');
  }
};

const verifyOrder = async (orderId) => {
  try {
    const response = await axios.get(`${CASHFREE_BASE_URL}/orders/${orderId}`, {
      headers: {
        'x-client-id': XClientId,
        'x-client-secret': XClientSecret,
        'x-environment': XEnvironment === CFEnvironment.PRODUCTION ? 'PRODUCTION' : 'SANDBOX',
        'x-api-version': '2025-01-01',
      },
    });

    if (response.data.order_status === 'PAID') {
      return {
        success: true,
        payment_id: response.data.cf_order_id,
        amount: response.data.order_amount,
      };
    }
    return { success: false };
  } catch (error) {
    console.error('Cashfree verifyOrder error:', error.response?.data || error.message);
    throw new Error('Payment verification failed');
  }
};

const processWebhook = async (payload, ip) => {
  const logEntry = {
    order_id: payload.order_id,
    payment_id: payload.payment_id || null,
    event_type: payload.type || 'UNKNOWN',
    payload,
    ip_address: ip,
  };

  const existingLog = await CashfreeWebhookLog.findOne({
    order_id: payload.order_id,
    event_type: payload.type,
    status: 'PROCESSED',
  });

  if (existingLog) {
    logEntry.status = 'DUPLICATE';
    await CashfreeWebhookLog.create(logEntry);
    return { success: true, message: 'Duplicate webhook ignored', duplicate: true };
  }

  try {
    const verification = await verifyOrder(payload.order_id);

    if (verification.success) {
      logEntry.status = 'PROCESSED';
      logEntry.payment_id = verification.payment_id;
      logEntry.processed_at = new Date();
    } else {
      logEntry.status = 'FAILED';
      logEntry.error = 'Payment not verified';
    }

    await CashfreeWebhookLog.create(logEntry);
    return { success: verification.success, verification };
  } catch (error) {
    logEntry.status = 'FAILED';
    logEntry.error = error.message;
    await CashfreeWebhookLog.create(logEntry);
    return { success: false, error: error.message };
  }
};

const getWebhookLogs = async (pagination = { skip: 0, limit: 20 }) => {
  return await CashfreeWebhookLog.find()
    .sort({ created_at: -1 })
    .skip(pagination.skip)
    .limit(pagination.limit);
};

const getFailedWebhooks = async () => {
  return await CashfreeWebhookLog.find({ status: 'FAILED' }).sort({ created_at: -1 });
};

module.exports = {
  createOrder,
  verifyOrder,
  processWebhook,
  getWebhookLogs,
  getFailedWebhooks,
};
