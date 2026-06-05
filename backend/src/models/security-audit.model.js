const mongoose = require('mongoose');

const SecurityAuditSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  action: { type: String, required: true },
  resource_type: { type: String, default: null },
  resource_id: { type: String, default: null },
  ip_address: { type: String, default: null },
  user_agent: { type: String, default: null },
  risk_level: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'LOW',
  },
  details: { type: mongoose.Schema.Types.Mixed, default: null },
  flagged: { type: Boolean, default: false },
  flag_reason: { type: String, default: null },
}, {
  timestamps: { createdAt: 'created_at' },
});

SecurityAuditSchema.index({ user_id: 1, created_at: -1 });
SecurityAuditSchema.index({ action: 1, created_at: -1 });
SecurityAuditSchema.index({ risk_level: 1, created_at: -1 });
SecurityAuditSchema.index({ flagged: 1, created_at: -1 });
SecurityAuditSchema.index({ ip_address: 1, created_at: -1 });

module.exports = mongoose.model('SecurityAudit', SecurityAuditSchema);
