const mongoose = require('mongoose');

const FriendSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  friend_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['PENDING', 'ACCEPTED', 'BLOCKED'],
    default: 'PENDING',
  },
  initiated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  blocked_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

FriendSchema.index({ user_id: 1, friend_id: 1 }, { unique: true });
FriendSchema.index({ user_id: 1, status: 1 });
FriendSchema.index({ friend_id: 1, status: 1 });

FriendSchema.pre('save', async function () {
  if (this.user_id.toString() === this.friend_id.toString()) {
    throw new Error('Cannot add yourself as a friend');
  }
});

module.exports = mongoose.model('Friend', FriendSchema);
