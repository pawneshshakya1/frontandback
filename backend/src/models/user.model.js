const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password_hash: {
    type: String,
    required: true,
    minlength: 6,
  },
  google_id: {
    type: String,
    sparse: true,
  },
  facebook_id: {
    type: String,
    sparse: true,
  },
  apple_id: {
    type: String,
    sparse: true,
  },
  role: {
    type: String,
    enum: ['USER', 'MEDIATOR', 'PARTNER', 'ADMIN'],
    default: 'USER',
  },
  is_verified: {
    type: Boolean,
    default: false,
  },
  verification_source: {
    type: String,
    enum: ['PREMIUM', 'MANUAL', null],
    default: null,
  },
  is_blocked: {
    type: Boolean,
    default: false,
  },
  block_reason: {
    type: String,
    default: null,
  },
  account_status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
    default: 'ACTIVE',
  },
  mediator_application_status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: null,
  },
  mediator_application_note: {
    type: String,
    default: null,
  },
  pass_type: {
    type: String,
    default: null,
  },
  pass_expiry: {
    type: Date,
    default: null,
  },
  pass_activated_at: {
    type: Date,
    default: null,
  },
  pass_order_id: {
    type: String,
    default: null,
  },
  pending_pass_type: {
    type: String,
    default: null,
  },
  // ============ USER ELITE PASS EVENT QUOTA ============
  // For user (non-partner) passes: total events the user can host
  // for the duration of the active pass.
  pass_event_count: {
    type: Number,
    default: null,
  },
  pass_events_used: {
    type: Number,
    default: 0,
  },
  phone: {
    type: String,
    default: null,
  },
  avatar: {
    type: String,
    default: null,
  },
  last_login_at: {
    type: Date,
    default: null,
  },
  login_count: {
    type: Number,
    default: 0,
  },
  last_seen: {
    type: Date,
    default: null,
  },
  is_online: {
    type: Boolean,
    default: false,
  },
  is_wallet_initialized: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

UserSchema.pre('save', async function () {
  if (!this.isModified('password_hash')) return;
  const salt = await bcrypt.genSalt(10);
  this.password_hash = await bcrypt.hash(this.password_hash, salt);
});

UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password_hash);
};

UserSchema.index({ role: 1 });
UserSchema.index({ account_status: 1 });

module.exports = mongoose.model('User', UserSchema);
