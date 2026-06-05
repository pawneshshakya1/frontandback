const notificationService = require('../services/notification.service');
const userSessionService = require('../services/user-session.service');
const pushScheduler = require('../services/push-notification-scheduler.service');
const STATUS_CODES = require('../utils/statusCodes');

// ============ FCM TOKEN MANAGEMENT ============

const registerToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.sendError(new Error('FCM token is required'), 'FCM token is required', STATUS_CODES.BAD_REQUEST);
    }

    console.log(`[PUSH] Registering token for user ${req.userId}: ${token.substring(0, 40)}...`);
    const result = await userSessionService.addFcmToken(req.userId, token);
    console.log(`[PUSH] Token registered successfully for user ${req.userId}`);
    res.sendSuccess(result, result.message, STATUS_CODES.OK);
  } catch (error) {
    console.error('[PUSH] Token registration error:', error.message);
    res.sendError(error, error.message, STATUS_CODES.SERVER_ERROR);
  }
};

const removeToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.sendError(new Error('FCM token is required'), 'FCM token is required', STATUS_CODES.BAD_REQUEST);
    }

    const result = await userSessionService.removeFcmToken(req.userId, token);
    res.sendSuccess(result, result.message, STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.SERVER_ERROR);
  }
};

// ============ NOTIFICATION CRUD ============

const getNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const notifications = await notificationService.getUserNotifications(req.userId, { skip, limit });
    const unreadCount = await notificationService.getUnreadCount(req.userId);

    res.sendSuccess({ notifications, unreadCount }, 'Notifications retrieved', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.SERVER_ERROR);
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const count = await notificationService.getUnreadCount(req.userId);
    res.sendSuccess({ count }, 'Unread count retrieved', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.SERVER_ERROR);
  }
};

const markAsRead = async (req, res) => {
  try {
    const notification = await notificationService.markAsRead(req.userId, req.params.id);
    res.sendSuccess(notification, 'Notification marked as read', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const result = await notificationService.markAllAsRead(req.userId);
    res.sendSuccess(result, result.message, STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const deleteNotification = async (req, res) => {
  try {
    const result = await notificationService.deleteNotification(req.userId, req.params.id);
    res.sendSuccess(result, result.message, STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

// ============ NOTIFICATION PREFERENCES ============

const getPreferences = async (req, res) => {
  try {
    const prefs = await notificationService.getPreferences(req.userId);
    res.sendSuccess(prefs, 'Preferences retrieved', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.SERVER_ERROR);
  }
};

const updatePreferences = async (req, res) => {
  try {
    const prefs = await notificationService.updatePreferences(req.userId, req.body);
    res.sendSuccess(prefs, 'Preferences updated', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

// ============ ADMIN BROADCAST (Batch Scheduler) ============

const sendBroadcast = async (req, res) => {
  try {
    console.log('[BROADCAST] Request received from admin:', req.userId);
    console.log('[BROADCAST] Body:', JSON.stringify(req.body));

    const { title, body, target, batchSize, batchDelay, data, sendMode, scheduledAt, image } = req.body;

    if (!title || !body) {
      console.log('[BROADCAST] Error: Title and body are required');
      return res.sendError(new Error('Title and body are required'), 'Title and body are required', STATUS_CODES.BAD_REQUEST);
    }

    const result = await pushScheduler.createBroadcastJob({
      title,
      body,
      target: target || 'all',
      batchSize: batchSize || 50,
      batchDelay: batchDelay || 5000,
      data: data || {},
      sendMode: sendMode || 'instant',
      scheduledAt: scheduledAt || null,
      image: image || null,
    });

    console.log('[BROADCAST] Result:', JSON.stringify(result));

    if (result.error) {
      console.log('[BROADCAST] Error:', result.error);
      return res.sendError(new Error(result.error), result.error, STATUS_CODES.BAD_REQUEST);
    }

    const message = result.sendMode === 'scheduled'
      ? `Notification scheduled for ${result.scheduledAt}`
      : 'Broadcast job created';

    res.sendSuccess(result, message, STATUS_CODES.OK);
  } catch (error) {
    console.error('[BROADCAST] Controller error:', error);
    res.sendError(error, error.message, STATUS_CODES.SERVER_ERROR);
  }
};

const getBroadcastStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const status = pushScheduler.getJobStatus(jobId);

    if (!status) {
      return res.sendError(new Error('Job not found'), 'Job not found', STATUS_CODES.NOT_FOUND);
    }

    res.sendSuccess(status, 'Broadcast status retrieved', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.SERVER_ERROR);
  }
};

const getAllBroadcastJobs = async (req, res) => {
  try {
    const jobs = pushScheduler.getAllJobs();
    res.sendSuccess(jobs, 'All broadcast jobs retrieved', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.SERVER_ERROR);
  }
};

const cancelBroadcast = async (req, res) => {
  try {
    const { jobId } = req.params;
    const result = pushScheduler.cancelJob(jobId);

    if (result.error) {
      return res.sendError(new Error(result.error), result.error, STATUS_CODES.BAD_REQUEST);
    }

    res.sendSuccess(result, 'Broadcast cancelled', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.SERVER_ERROR);
  }
};

// ============ DIAGNOSTIC: FCM TOKEN STATUS ============

const getTokenStatus = async (req, res) => {
  try {
    const UserSession = require('../models/user-session.model');
    const User = require('../models/user.model');

    const totalUsers = await User.countDocuments({ account_status: 'ACTIVE' });
    const sessionsWithTokens = await UserSession.countDocuments({
      fcm_tokens: { $exists: true, $ne: [] },
    });
    const totalTokens = await UserSession.aggregate([
      { $match: { fcm_tokens: { $exists: true, $ne: [] } } },
      { $project: { count: { $size: '$fcm_tokens' } } },
      { $group: { _id: null, total: { $sum: '$count' } } },
    ]);

    const mySession = await UserSession.findOne({ user_id: req.userId }).select('fcm_tokens');

    res.sendSuccess({
      totalActiveUsers: totalUsers,
      usersWithTokens: sessionsWithTokens,
      totalTokens: totalTokens[0]?.total || 0,
      myTokens: mySession?.fcm_tokens?.length || 0,
      myTokenSample: mySession?.fcm_tokens?.[0]?.substring(0, 30) || 'none',
    }, 'Token status retrieved', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.SERVER_ERROR);
  }
};

module.exports = {
  registerToken,
  removeToken,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getPreferences,
  updatePreferences,
  sendBroadcast,
  getBroadcastStatus,
  getAllBroadcastJobs,
  cancelBroadcast,
  getTokenStatus,
};
