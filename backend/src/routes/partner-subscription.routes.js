const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/partner-subscription.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');
const { validateObjectId } = require('../middlewares/security.middleware');

// ============ ALL AUTHENTICATED USERS (USER + PARTNER + ADMIN) ============
router.use(protect);

// Public list (all subscribable partners)
router.get('/all', subscriptionController.getAllPartners);
router.get('/nearby', subscriptionController.getNearbyPartners);
router.get('/my-subscriptions', subscriptionController.getMySubscriptionsWithDetails);
router.get('/:id', validateObjectId('id'), subscriptionController.getPublicPartnerProfile);

// USER/PARTNER/ADMIN: subscribe actions (any user can subscribe to partners)
router.post('/subscribe', restrictTo('USER', 'PARTNER', 'ADMIN'), subscriptionController.subscribe);
router.post('/scan-qr', restrictTo('USER', 'PARTNER', 'ADMIN'), subscriptionController.subscribeByQrToken);
router.delete('/unsubscribe/:partner_id', restrictTo('USER', 'PARTNER', 'ADMIN'), validateObjectId('partner_id'), subscriptionController.unsubscribe);
router.post('/pause/:partner_id', restrictTo('USER', 'PARTNER', 'ADMIN'), validateObjectId('partner_id'), subscriptionController.pause);
router.post('/resume/:partner_id', restrictTo('USER', 'PARTNER', 'ADMIN'), validateObjectId('partner_id'), subscriptionController.resume);
router.put('/preferences/:partner_id', restrictTo('USER', 'PARTNER', 'ADMIN'), validateObjectId('partner_id'), subscriptionController.updatePreferences);

module.exports = router;
