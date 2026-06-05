const express = require('express');
const router = express.Router();
const { z } = require('zod');
const walletController = require('../controllers/wallet.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');
const { walletLimiter } = require('../middlewares/rateLimit.middleware');
const validate = require('../middlewares/validate.middleware');

const initializeWalletSchema = z.object({
  body: z.object({
    pin: z.string().length(6, 'PIN must be exactly 6 digits').regex(/^\d+$/, 'PIN must contain only digits'),
    confirmPin: z.string().length(6, 'PIN must be exactly 6 digits').regex(/^\d+$/, 'PIN must contain only digits'),
  }).refine((data) => data.pin === data.confirmPin, {
    message: 'PINs do not match',
    path: ['confirmPin'],
  }),
});

const sendGiftSchema = z.object({
  body: z.object({
    receiverAccountNo: z.string().min(5, 'Account number is too short'),
    amount: z.number().positive('Amount must be positive'),
    pin: z.string().length(6, 'PIN must be exactly 6 digits'),
  }),
});

const resetPinSchema = z.object({
  body: z.object({
    otp: z.string().min(4, 'OTP is too short'),
    newPin: z.string().length(6, 'PIN must be exactly 6 digits'),
  }),
});

const updateSettingsSchema = z.object({
  body: z.object({
    per_transaction_limit: z.number().nonnegative().optional(),
    daily_send_limit: z.number().nonnegative().optional(),
    max_wallet_balance: z.number().nonnegative().optional(),
    low_balance_threshold: z.number().nonnegative().optional(),
    require_pin_above: z.number().nonnegative().optional(),
    transaction_notifications: z.boolean().optional(),
    low_balance_alerts: z.boolean().optional(),
    auto_lock_inactive: z.boolean().optional(),
    hide_balance_by_default: z.boolean().optional(),
  }).strict(),
});

router.get('/my', protect, walletLimiter, walletController.getMyWallet);
router.get('/last-deposit-source', protect, walletLimiter, walletController.getLastDepositSource);
router.post('/initialize', protect, walletLimiter, validate(initializeWalletSchema), walletController.initializeWallet);
router.post('/deposit', protect, walletLimiter, restrictTo('ADMIN'), walletController.deposit);
router.post('/withdraw', protect, walletLimiter, restrictTo('ADMIN'), walletController.withdraw);
router.post('/request-pin-reset', protect, walletLimiter, walletController.requestPinReset);
router.post('/verify-pin-otp', protect, walletLimiter, walletController.verifyPinOtp);
router.post('/reset-pin', protect, walletLimiter, validate(resetPinSchema), walletController.resetPin);
router.get('/settings', protect, walletLimiter, walletController.getSettings);
router.put('/settings', protect, walletLimiter, validate(updateSettingsSchema), walletController.updateSettings);

// Payment routes
router.post('/add-cash/initiate', protect, walletLimiter, walletController.initiateAddCash);
router.post('/add-cash/verify', protect, walletLimiter, walletController.verifyAddCash);

// Transaction routes
router.get('/transactions', protect, walletLimiter, walletController.getTransactions);
router.post('/transactions/record', protect, walletLimiter, walletController.createTransaction);

// QR-based transfer routes
router.post('/verify-receiver', protect, walletLimiter, walletController.verifyReceiver);
router.post('/validate-qr', protect, walletLimiter, walletController.validateQRCode);
router.get('/my-qr', protect, walletLimiter, walletController.getMyQRCode);
router.post('/send-gift', protect, walletLimiter, validate(sendGiftSchema), walletController.sendGift);
router.post('/redeem', protect, walletLimiter, walletController.redeem);

module.exports = router;
