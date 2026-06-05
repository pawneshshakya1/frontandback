const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { protect } = require('../middlewares/auth.middleware');
const { isAdmin } = require('../middlewares/admin.middleware');
const { validateObjectId } = require('../middlewares/security.middleware');

router.use(protect);

// ============ FCM TOKEN ============
router.post('/register-token', notificationController.registerToken);
router.post('/remove-token', notificationController.removeToken);

// ============ DIAGNOSTIC ============
router.get('/token-status', notificationController.getTokenStatus);

// ============ ADMIN BROADCAST (Batch Scheduler) ============
// IMPORTANT: These routes MUST be before /:id routes to prevent
// Express from matching "send-broadcast" as an :id parameter
router.post('/send-broadcast', isAdmin, notificationController.sendBroadcast);
router.get('/broadcast/status/:jobId', isAdmin, notificationController.getBroadcastStatus);
router.get('/broadcast/jobs', isAdmin, notificationController.getAllBroadcastJobs);
router.post('/broadcast/cancel/:jobId', isAdmin, notificationController.cancelBroadcast);

// ============ NOTIFICATIONS ============
router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.put('/mark-all-read', notificationController.markAllAsRead);
router.put('/:id/read', validateObjectId('id'), notificationController.markAsRead);
router.delete('/:id', validateObjectId('id'), notificationController.deleteNotification);

// ============ PREFERENCES ============
router.get('/preferences', notificationController.getPreferences);
router.put('/preferences', notificationController.updatePreferences);

module.exports = router;
