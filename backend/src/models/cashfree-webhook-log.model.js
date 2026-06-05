const mongoose = require('mongoose');

const CashfreeWebhookLogSchema = new mongoose.Schema({
  order_id: { type: String, required: true },
  payment_id: { type: String, default: null },
  event_type: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  signature_verified: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['RECEIVED', 'PROCESSED', 'FAILED', 'DUPLICATE'],
    default: 'RECEIVED',
  },
  error: { type: String, default: null },
  processed_at: { type: Date, default: null },
  ip_address: { type: String, default: null },
}, {
  timestamps: { createdAt: 'created_at' },
});

CashfreeWebhookLogSchema.index({ order_id: 1 });
CashfreeWebhookLogSchema.index({ status: 1, created_at: -1 });
CashfreeWebhookLogSchema.index({ created_at: -1 });

module.exports = mongoose.model('CashfreeWebhookLog', CashfreeWebhookLogSchema);
