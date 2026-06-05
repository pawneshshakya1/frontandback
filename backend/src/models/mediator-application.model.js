const mongoose = require('mongoose');

const MediatorApplicationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING',
  },
  note: { type: String, default: null },
  applied_at: { type: Date, default: Date.now },
  reviewed_at: { type: Date, default: null },
  reviewed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

MediatorApplicationSchema.index({ status: 1 });

module.exports = mongoose.model('MediatorApplication', MediatorApplicationSchema);
