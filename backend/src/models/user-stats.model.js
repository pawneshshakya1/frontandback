const mongoose = require('mongoose');

const UserStatsSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  total_matches_played: { type: Number, default: 0 },
  total_matches_won: { type: Number, default: 0 },
  total_earnings: { type: Number, default: 0 },
  win_rate: { type: Number, default: 0 },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

UserStatsSchema.index({ total_earnings: -1 });
UserStatsSchema.index({ total_matches_won: -1 });

module.exports = mongoose.model('UserStats', UserStatsSchema);
