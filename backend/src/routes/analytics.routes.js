const express = require('express');
const router = express.Router();
const { protect, optionalAuth } = require('../middlewares/auth.middleware');
const { isAdmin } = require('../middlewares/admin.middleware');
const analyticsController = require('../controllers/analytics.controller');
const { validateObjectId } = require('../middlewares/security.middleware');

router.get('/my-analytics', protect, analyticsController.getMyAnalytics);

router.get('/admin/users-spending', protect, isAdmin, analyticsController.getAdminAllUsersSpending);
router.get('/admin/user/:userId', protect, isAdmin, validateObjectId('userId'), analyticsController.getAdminUserFinancialProfile);
router.get('/admin/revenue', protect, isAdmin, analyticsController.getSystemRevenue);

module.exports = router;
