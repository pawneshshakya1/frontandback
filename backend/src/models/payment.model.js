const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  order_id: {
    type: String,
    required: true,
    unique: true,
  },
  payment_id: {
    type: String,
    default: null,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'INR',
  },
  method: {
    type: String,
    enum: ['WALLET', 'CASHFREE_UPI', 'CASHFREE_CARD', 'CASHFREE_NETBANKING', 'CASHFREE_WALLET'],
    default: 'WALLET',
  },
  status: {
    type: String,
    enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'],
    default: 'PENDING',
  },
  match_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    default: null,
  },
  type: {
    type: String,
    enum: ['DEPOSIT', 'ENTRY_FEE', 'ELITE_PASS', 'REFUND'],
    required: true,
  },
  customer_phone: { type: String, default: null },
  customer_email: { type: String, default: null },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  cashfree_response: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  webhook_received: {
    type: Boolean,
    default: false,
  },
  webhook_received_at: {
    type: Date,
    default: null,
  },
  webhook_payload: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
}, {
  timestamps: true,
});

PaymentSchema.index({ user_id: 1, createdAt: -1 });
PaymentSchema.index({ status: 1, createdAt: -1 });
PaymentSchema.index({ type: 1, createdAt: -1 });
PaymentSchema.index({ webhook_received: 1 });

module.exports = mongoose.model('Payment', PaymentSchema);
