const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
  ticket_number: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  user_role: {
    type: String,
    enum: ['USER', 'PARTNER', 'ADMIN', 'MEDIATOR'],
    required: true,
  },
  category: {
    type: String,
    enum: [
      'PAYMENT_ISSUE',
      'MATCH_DISPUTE',
      'ACCOUNT_ISSUE',
      'PARTNER_RELATED',
      'TECHNICAL_BUG',
      'REFUND_REQUEST',
      'REPORT_PLAYER',
      'GAME_RULES',
      'FEATURE_REQUEST',
      'OTHER',
    ],
    required: true,
    index: true,
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    default: 'MEDIUM',
    index: true,
  },
  status: {
    type: String,
    enum: ['OPEN', 'IN_PROGRESS', 'AWAITING_USER', 'RESOLVED', 'CLOSED'],
    default: 'OPEN',
    index: true,
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    required: true,
    maxlength: 5000,
  },
  related_match_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    default: null,
  },
  attachments: [{
    type: String, // URLs to uploaded files
  }],
  assigned_to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },
  assigned_at: {
    type: Date,
    default: null,
  },
  resolved_at: {
    type: Date,
    default: null,
  },
  closed_at: {
    type: Date,
    default: null,
  },
  last_reply_at: {
    type: Date,
    default: Date.now,
  },
  last_reply_by: {
    type: String,
    enum: ['USER', 'ADMIN', 'SYSTEM'],
    default: 'USER',
  },
  // User satisfaction
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null,
  },
  rating_feedback: {
    type: String,
    maxlength: 1000,
    default: null,
  },
}, {
  timestamps: true,
});

const supportReplySchema = new mongoose.Schema({
  ticket_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SupportTicket',
    required: true,
    index: true,
  },
  sender_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  sender_role: {
    type: String,
    enum: ['USER', 'PARTNER', 'ADMIN', 'MEDIATOR', 'SYSTEM'],
    required: true,
  },
  message: {
    type: String,
    required: true,
    maxlength: 5000,
  },
  attachments: [{
    type: String,
  }],
  is_internal_note: {
    type: Boolean,
    default: false, // internal notes only visible to admins
  },
  read_at: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

supportTicketSchema.index({ status: 1, priority: 1, createdAt: -1 });
supportTicketSchema.index({ user_id: 1, status: 1 });
supportReplySchema.index({ ticket_id: 1, createdAt: 1 });

supportTicketSchema.statics.generateTicketNumber = async function() {
  const year = new Date().getFullYear();
  const lastTicket = await this.findOne({ ticket_number: new RegExp(`^BC-${year}-`) })
    .sort({ createdAt: -1 })
    .lean();
  let nextSeq = 1;
  if (lastTicket) {
    const match = lastTicket.ticket_number.match(/^BC-\d{4}-(\d+)$/);
    if (match) nextSeq = parseInt(match[1], 10) + 1;
  }
  return `BC-${year}-${String(nextSeq).padStart(6, '0')}`;
};

module.exports = {
  SupportTicket: mongoose.model('SupportTicket', supportTicketSchema),
  SupportReply: mongoose.model('SupportReply', supportReplySchema),
};
