const mongoose = require('mongoose');

const AchievementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
  },
  category: {
    type: String,
    enum: ['MATCHES', 'WINS', 'KILLS', 'WALLET', 'STREAK', 'SOCIAL', 'SPECIAL'],
    default: 'SPECIAL',
  },
  tier: {
    type: String,
    enum: ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'],
    default: 'BRONZE',
  },
  points: {
    type: Number,
    default: 0,
    min: 0,
  },
  icon: {
    type: String,
    default: 'emoji-events',
  },
  color: {
    type: String,
    default: '#fbbf24',
  },
  target_value: {
    type: Number,
    default: 1,
  },
  criteria: {
    type: String,
    default: '',
  },
  reward_amount: {
    type: Number,
    default: 0,
  },
  is_active: {
    type: Boolean,
    default: true,
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

AchievementSchema.index({ is_active: 1, category: 1 });
AchievementSchema.index({ tier: 1 });
AchievementSchema.index({ created_at: -1 });

module.exports = mongoose.model('Achievement', AchievementSchema);
