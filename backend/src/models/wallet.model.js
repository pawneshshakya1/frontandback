const mongoose = require('mongoose');

const WalletSettingsSchema = new mongoose.Schema({
  per_transaction_limit: {
    type: Number,
    default: 5000,
    min: 0,
  },
  daily_send_limit: {
    type: Number,
    default: 10000,
    min: 0,
  },
  max_wallet_balance: {
    type: Number,
    default: 100000,
    min: 0,
  },
  low_balance_threshold: {
    type: Number,
    default: 100,
    min: 0,
  },
  require_pin_above: {
    type: Number,
    default: 0,
    min: 0,
  },
  transaction_notifications: {
    type: Boolean,
    default: true,
  },
  low_balance_alerts: {
    type: Boolean,
    default: true,
  },
  auto_lock_inactive: {
    type: Boolean,
    default: false,
  },
  hide_balance_by_default: {
    type: Boolean,
    default: false,
  },
}, { _id: false });

const WalletSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  wallet_account_no: {
    type: String,
    required: true,
    unique: true,
  },
  wallet_account_no_hash: {
    type: String,
    unique: true,
    sparse: true,
  },
  wallet_pin_hash: {
    type: String,
    required: true,
  },
  available_balance: {
    type: String,
    default: '0',
  },
  locked_balance: {
    type: String,
    default: '0',
  },
  withdrawable_balance: {
    type: String,
    default: '0',
  },
  settings: {
    type: WalletSettingsSchema,
    default: () => ({}),
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Wallet', WalletSchema);
