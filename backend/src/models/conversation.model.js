const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  // Two participants. Index ensures a (a,b) pair is unique regardless of order.
  participants: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    required: true,
    validate: {
      validator: (v) => Array.isArray(v) && v.length === 2,
      message: 'Conversation must have exactly 2 participants',
    },
  },
  last_message: { type: String, default: null },
  last_message_at: { type: Date, default: Date.now },
  last_message_sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Unique ordered pair index — prevents duplicate conversations.
ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ participants: 1, last_message_at: -1 });

module.exports = mongoose.model('Conversation', ConversationSchema);
