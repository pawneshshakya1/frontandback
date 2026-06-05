const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { protect } = require('../middlewares/auth.middleware');
const { isAdmin } = require('../middlewares/admin.middleware');

router.post('/initiate-cashfree', protect, paymentController.initiateCashfreePayment);
router.post('/verify', protect, paymentController.verifyPayment);
router.get('/history', protect, paymentController.getPaymentHistory);
router.get('/:id', protect, paymentController.getPaymentById);

router.get('/admin/payments', protect, isAdmin, paymentController.getAdminPayments);
router.get('/admin/payments/stats', protect, isAdmin, paymentController.getPaymentStats);

module.exports = router;
