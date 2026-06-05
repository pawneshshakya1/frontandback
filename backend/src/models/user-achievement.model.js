const mongoose = require('mongoose');

const UserAchievementSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  achievement_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Achievement',
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['IN_PROGRESS', 'ACHIEVED', 'CLAIMED'],
    default: 'IN_PROGRESS',
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
  },
  achieved_at: {
    type: Date,
    default: null,
  },
  claimed_at: {
    type: Date,
    default: null,
  },
  reward_credited: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

UserAchievementSchema.index({ user_id: 1, achievement_id: 1 }, { unique: true });
UserAchievementSchema.index({ user_id: 1, status: 1 });

module.exports = mongoose.model('UserAchievement', UserAchievementSchema);
