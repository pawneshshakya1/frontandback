const mongoose = require('mongoose');

const UserProfileSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  full_name: { type: String, trim: true, default: null },
  phone: { type: String, trim: true, sparse: true },
  game_uid_name: { type: String, trim: true, default: null },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], default: null },
  ff_max_uid: { type: String, trim: true, default: null },
  guild_uid: { type: String, trim: true, default: null },
  guild_name: { type: String, trim: true, default: null },
  preferred_role: { type: String, enum: ['Rusher', 'Sniper', 'Support', 'Other', ''], default: null },
  discord_tag: { type: String, trim: true, default: null },
  bio: { type: String, trim: true, default: null },
  avatar: { type: String, default: null },
  background_image: { type: String, default: null },
  instagram: { type: String, trim: true, default: null },
  facebook: { type: String, trim: true, default: null },
  x_twitter: { type: String, trim: true, default: null },
  threads: { type: String, trim: true, default: null },
  youtube: { type: String, trim: true, default: null },
  discord_server: { type: String, trim: true, default: null },
  ads_disabled: { type: Boolean, default: false },
  payment_preference: {
    type: String,
    enum: ['WALLET', 'CASHFREE', 'ASK_ALWAYS'],
    default: 'ASK_ALWAYS',
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

UserProfileSchema.index({ ff_max_uid: 'text' });
UserProfileSchema.index({ guild_name: 'text' });

module.exports = mongoose.model('UserProfile', UserProfileSchema);
