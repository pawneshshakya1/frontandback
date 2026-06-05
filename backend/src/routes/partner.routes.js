const express = require('express');
const router = express.Router();
const partnerController = require('../controllers/partner.controller');
const subscriptionController = require('../controllers/partner-subscription.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');
const { validateObjectId } = require('../middlewares/security.middleware');

// ============ TIER PURCHASE (accessible to ALL authenticated users) ============
// A regular user needs to buy a partner tier to BECOME a partner
router.use(protect); // All routes require authentication

router.post('/tier/purchase', partnerController.purchaseTier);
router.post('/tier/verify', partnerController.verifyTierPurchase);

// ============ PARTNER-ONLY ROUTES ============
// From here, only PARTNER and ADMIN roles can access
router.use(restrictTo('PARTNER', 'ADMIN'));

// ============ DASHBOARD & PROFILE ============
router.get('/dashboard', partnerController.getDashboard);
router.get('/profile', partnerController.getProfile);
router.put('/profile', partnerController.updateProfile);
router.get('/commission-history', partnerController.getCommissionHistory);

// ============ TIER MANAGEMENT ============
router.get('/tier', partnerController.getTierInfo);
// /tier/upgrade is restricted to ADMIN only — partners must use /tier/purchase + /tier/verify
router.post('/tier/upgrade', restrictTo('ADMIN'), partnerController.upgradeTier);
router.post('/tier/degrade', partnerController.degradeTier);

// ============ TIER HISTORY ============
router.get('/tier/history', partnerController.getTierHistory);

// ============ EVENT MANAGEMENT ============
router.post('/events', partnerController.createEvent);
router.get('/events', partnerController.getEvents);
router.get('/events/:id', partnerController.getEvent);
router.put('/events/:id', partnerController.updateEvent);
router.delete('/events/:id', partnerController.deleteEvent);
router.post('/events/:id/publish', partnerController.publishEvent);
router.post('/events/:id/room-details', partnerController.updateRoomDetails);
router.get('/events/:id/participants', partnerController.getParticipants);

// Subscription management (for partners to see their subscribers)
router.get('/subscribers', subscriptionController.getSubscribers);

// Partner's own QR code for subscribe-by-scan
router.get('/qr-code', partnerController.getMyQrCode);
router.post('/qr-code/regenerate', partnerController.regenerateMyQrCode);

module.exports = router;
