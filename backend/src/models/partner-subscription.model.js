const mongoose = require('mongoose');

const PartnerSubscriptionSchema = new mongoose.Schema({
  subscriber_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  partner_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PartnerProfile',
    required: true,
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'CANCELLED', 'PAUSED'],
    default: 'ACTIVE',
  },
  notify_new_events: {
    type: Boolean,
    default: true,
  },
  notify_promotions: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

PartnerSubscriptionSchema.index({ subscriber_id: 1, partner_id: 1 }, { unique: true });
PartnerSubscriptionSchema.index({ partner_id: 1, status: 1 });
PartnerSubscriptionSchema.index({ subscriber_id: 1, status: 1 });

module.exports = mongoose.model('PartnerSubscription', PartnerSubscriptionSchema);
