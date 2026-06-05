const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  conversation_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true,
  },
  sender_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 4000,
  },
  read_at: {
    type: Date,
    default: null,
  },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

MessageSchema.index({ conversation_id: 1, created_at: -1 });

module.exports = mongoose.model('Message', MessageSchema);
