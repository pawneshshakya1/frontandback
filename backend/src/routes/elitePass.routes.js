const express = require('express');
const router = express.Router();
const elitePassController = require('../controllers/elitePass.controller');
const { protect } = require('../middlewares/auth.middleware');
const { isAdmin } = require('../middlewares/admin.middleware');

// Public route - Get active passes for users to view/buy
router.get('/active', elitePassController.getActivePasses);

// Public route - Get active partner passes (for "Become a Partner" section)
router.get('/partner-passes', elitePassController.getPartnerPasses);

// User routes (protected)
router.get('/my-pass', protect, elitePassController.getUserPassStatus);
router.post('/purchase', protect, elitePassController.initiatePurchase);
router.post('/verify', protect, elitePassController.verifyPurchase);
router.post('/cancel', protect, elitePassController.cancelPurchase);

// Admin routes (protected + admin)
router.get('/admin/all', protect, isAdmin, elitePassController.getAllPassesAdmin);
router.post('/admin', protect, isAdmin, elitePassController.createPass);
router.put('/admin/:id', protect, isAdmin, elitePassController.updatePass);
router.delete('/admin/:id', protect, isAdmin, elitePassController.deletePass);
router.post('/admin/seed', protect, isAdmin, elitePassController.seedDefaultPasses);

module.exports = router;
