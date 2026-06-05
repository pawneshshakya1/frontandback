const Notification = require('../models/notification.model');
const NotificationPreference = require('../models/notification-preference.model');
const { broadcastToUser } = require('../utils/sse');
const emailService = require('./email.service');

// ============ CORE NOTIFICATION CREATION ============

const createNotification = async (userId, title, body, type = 'SYSTEM', data = {}, senderId = null) => {
  // Check user preferences before creating
  const prefs = await NotificationPreference.getOrCreate(userId);

  // Check if in-app notification is enabled for this type
  const inAppEnabled = prefs.isEnabled(type, 'push'); // push preference also controls in-app visibility

  // Create the notification in DB (always save for history)
  const notification = await Notification.create({
    user_id: userId,
    sender_id: senderId,
    title,
    body,
    type,
    data,
  });

  // Send SSE (real-time in-app)
  if (inAppEnabled) {
    broadcastToUser(userId, {
      type: 'NOTIFICATION',
      data: {
        _id: notification._id,
        title,
        body,
        type,
        data,
        isRead: false,
        createdAt: notification.createdAt,
      },
    });
  }

  // Send push notification (FCM)
  if (prefs.push_enabled && prefs.isEnabled(type, 'push')) {
    try {
      const UserSession = require('../models/user-session.model');
      const session = await UserSession.findOne({ user_id: userId });
      if (session && session.fcm_tokens && session.fcm_tokens.length > 0) {
        await sendPushNotification(session.fcm_tokens, title, body, { ...data, notificationId: notification._id.toString(), type });
      }
    } catch (err) {
      console.error('Push notification failed:', err.message);
    }
  }

  // Send email notification
  if (prefs.isEnabled(type, 'email')) {
    try {
      const User = require('../models/user.model');
      const user = await User.findById(userId).select('email username');
      if (user && user.email) {
        await sendEmailNotification(user.email, user.username, title, body, type, data);
      }
    } catch (err) {
      console.error('Email notification failed:', err.message);
    }
  }

  return notification;
};

// ============ PUSH NOTIFICATION (Firebase Admin SDK) ============

const sendPushNotification = async (tokens, title, body, data = {}) => {
  try {
    const { admin } = require('../config/firebase');

    if (!admin || !admin.apps.length) {
      console.warn('Firebase Admin not initialized, skipping push notification');
      return;
    }

    const message = {
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    // Handle failed tokens (remove invalid ones)
    if (response.failureCount > 0) {
      const UserSession = require('../models/user-session.model');
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
          console.error('Push failed for token:', tokens[idx], resp.error?.message);
        }
      });

      // Remove invalid tokens
      if (failedTokens.length > 0) {
        for (const token of failedTokens) {
          try {
            await UserSession.updateMany({}, { $pull: { fcm_tokens: token } });
          } catch (e) { /* ignore cleanup errors */ }
        }
      }
    }

    return { success: true, successCount: response.successCount, failureCount: response.failureCount };
  } catch (error) {
    console.error('FCM Admin SDK error:', error.message);
    throw error;
  }
};

// ============ EMAIL NOTIFICATION ============

const sendEmailNotification = async (email, username, title, body, type, data = {}) => {
  const typeLabels = {
    SYSTEM: 'System Update',
    ANNOUNCEMENT: 'Announcement',
    MATCH_UPDATE: 'Tournament Update',
    FRIEND_REQUEST: 'Friend Request',
    FRIEND_EVENT: 'Friend Activity',
    PAYMENT: 'Payment Update',
    WALLET: 'Wallet Update',
    PASS: 'Elite Pass',
    PARTNER_EVENT: 'Partner Event',
    SECURITY: 'Security Alert',
    SECURITY_ALERT: 'Security Alert',
    REWARD: 'Reward',
    PROMOTION: 'Promotion',
  };

  const category = typeLabels[type] || 'Notification';
  const isSecurity = type === 'SECURITY' || type === 'SECURITY_ALERT';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0d0d0d; color: #fff; padding: 20px;">
      <div style="background: linear-gradient(135deg, #f47b25, #ea580c); padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
        <h1 style="color: white; margin: 0; font-size: 24px;">⚔️ BattleCore</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0;">${category}</p>
      </div>

      <div style="background: #1a1a1a; padding: 24px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
        <h2 style="color: ${isSecurity ? '#ef4444' : '#f47b25'}; margin: 0 0 12px 0; font-size: 18px;">${title}</h2>
        <p style="color: #94A3B8; font-size: 14px; line-height: 20px; margin: 0 0 20px 0;">Hi ${username},</p>
        <p style="color: #F8FAFC; font-size: 14px; line-height: 20px; margin: 0 0 20px 0;">${body}</p>

        ${data.match_id ? `<p style="color: #64748B; font-size: 12px;">Match ID: ${data.match_id}</p>` : ''}
        ${data.amount ? `<p style="color: #22c55e; font-size: 16px; font-weight: bold;">Amount: ₹${data.amount}</p>` : ''}
        ${isSecurity ? '<p style="color: #ef4444; font-size: 12px; margin-top: 16px;">⚠️ If you didn\'t perform this action, please change your password immediately.</p>' : ''}
      </div>

      <div style="text-align: center; padding: 16px; color: #64748B; font-size: 11px;">
        <p>BattleCore Esports Platform</p>
        <p>This is an automated email. Please do not reply.</p>
      </div>
    </div>
  `;

  await emailService.sendEmail({
    to: email,
    subject: `[BattleCore] ${title}`,
    text: `${title}\n\n${body}`,
    html,
  });
};

// ============ NOTIFICATION QUERIES ============

const getUserNotifications = async (userId, pagination = { skip: 0, limit: 20 }) => {
  return await Notification.find({ user_id: userId })
    .sort({ createdAt: -1 })
    .skip(pagination.skip)
    .limit(pagination.limit)
    .populate('sender_id', 'username avatar');
};

const getUnreadCount = async (userId) => {
  return await Notification.countDocuments({ user_id: userId, isRead: false });
};

const markAsRead = async (userId, notificationId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, user_id: userId },
    { isRead: true },
    { new: true }
  );

  if (!notification) throw new Error('Notification not found');

  const unreadCount = await getUnreadCount(userId);
  broadcastToUser(userId, { type: 'NOTIFICATION_READ', data: { unreadCount } });

  return notification;
};

const markAllAsRead = async (userId) => {
  await Notification.updateMany({ user_id: userId, isRead: false }, { isRead: true });
  broadcastToUser(userId, { type: 'NOTIFICATION_READ', data: { unreadCount: 0 } });
  return { message: 'All notifications marked as read' };
};

const deleteNotification = async (userId, notificationId) => {
  const result = await Notification.deleteOne({ _id: notificationId, user_id: userId });
  if (result.deletedCount === 0) throw new Error('Notification not found');
  return { message: 'Notification deleted' };
};

// ============ PREFERENCE MANAGEMENT ============

const getPreferences = async (userId) => {
  return await NotificationPreference.getOrCreate(userId);
};

const updatePreferences = async (userId, updates) => {
  const allowedFields = [
    'push_enabled', 'email_enabled', 'in_app_enabled',
    'tournament_updates', 'tournament_email',
    'payment_updates', 'wallet_updates', 'payment_email',
    'rewards_promotions', 'rewards_email',
    'friend_activity', 'friend_email',
    'partner_events', 'partner_email',
    'system_announcements', 'system_email',
    'pass_updates', 'pass_email',
  ];

  const filteredData = {};
  for (const key of allowedFields) {
    if (updates[key] !== undefined) {
      filteredData[key] = updates[key];
    }
  }

  // Security alerts cannot be disabled
  delete filteredData.security_alerts;
  delete filteredData.security_email;

  return await NotificationPreference.findOneAndUpdate(
    { user_id: userId },
    { $set: filteredData },
    { new: true, upsert: true }
  );
};

// ============ CONVENIENCE NOTIFICATION SENDERS ============

const sendMatchNotification = async (userId, matchId, action, matchTitle) => {
  const messages = {
    create: { title: 'New Event Created', body: `A new event "${matchTitle}" has been created` },
    join: { title: 'Someone Joined Your Event', body: `Someone joined your event "${matchTitle}"` },
    result_submitted: { title: 'Result Submitted', body: `Results submitted for "${matchTitle}"` },
    completed: { title: 'Event Completed', body: `Event "${matchTitle}" has been completed` },
  };

  const msg = messages[action] || { title: 'Match Update', body: `Event "${matchTitle}" updated` };

  return await createNotification(userId, msg.title, msg.body, 'MATCH_UPDATE', {
    match_id: matchId,
    action,
  });
};

const sendPaymentNotification = async (userId, orderId, status, amount) => {
  const messages = {
    SUCCESS: { title: 'Payment Successful', body: `Payment of ₹${amount} completed successfully` },
    FAILED: { title: 'Payment Failed', body: `Payment of ₹${amount} failed. Please try again.` },
    PENDING: { title: 'Payment Pending', body: `Payment of ₹${amount} is being processed` },
  };

  const msg = messages[status] || { title: 'Payment Update', body: `Payment status: ${status}` };

  return await createNotification(userId, msg.title, msg.body, 'PAYMENT', {
    order_id: orderId,
    status,
    amount,
  });
};

const sendWalletNotification = async (userId, action, amount) => {
  const messages = {
    deposit: { title: 'Wallet Credited', body: `₹${amount} has been added to your wallet` },
    withdraw: { title: 'Withdrawal Requested', body: `₹${amount} withdrawal request has been submitted` },
    entry_fee: { title: 'Entry Fee Deducted', body: `₹${amount} deducted for match entry` },
    prize_won: { title: 'Prize Won!', body: `Congratulations! ₹${amount} has been credited to your wallet` },
    gift_sent: { title: 'Gift Sent', body: `You sent ₹${amount} as a gift` },
    gift_received: { title: 'Gift Received', body: `You received ₹${amount} as a gift` },
  };

  const msg = messages[action] || { title: 'Wallet Update', body: `Wallet updated: ${action}` };

  return await createNotification(userId, msg.title, msg.body, 'WALLET', { action, amount });
};

const sendSecurityNotification = async (userId, action, details = {}) => {
  const messages = {
    login: { title: 'New Login Detected', body: `A new login was made to your account from ${details.device || 'unknown device'}` },
    password_changed: { title: 'Password Changed', body: 'Your account password has been changed' },
    two_factor_enabled: { title: '2FA Enabled', body: 'Two-factor authentication has been enabled on your account' },
    two_factor_disabled: { title: '2FA Disabled', body: 'Two-factor authentication has been disabled on your account' },
    email_changed: { title: 'Email Changed', body: 'Your account email has been updated' },
    phone_changed: { title: 'Phone Changed', body: 'Your account phone number has been updated' },
    account_blocked: { title: 'Account Blocked', body: `Your account has been blocked. Reason: ${details.reason || 'N/A'}` },
    pin_reset: { title: 'PIN Reset', body: 'Your wallet PIN has been reset' },
  };

  const msg = messages[action] || { title: 'Security Alert', body: `Security event: ${action}` };

  return await createNotification(userId, msg.title, msg.body, 'SECURITY', {
    action,
    ...details,
  });
};

const sendRewardNotification = async (userId, title, body, data = {}) => {
  return await createNotification(userId, title, body, 'REWARD', data);
};

const sendPromotionNotification = async (userId, title, body, data = {}) => {
  return await createNotification(userId, title, body, 'PROMOTION', data);
};

const sendBroadcast = async (title, body, data = {}) => {
  const User = require('../models/user.model');
  const users = await User.find({ account_status: 'ACTIVE' }).select('_id');

  const notifications = users.map(user => ({
    user_id: user._id,
    title,
    body,
    type: 'ANNOUNCEMENT',
    data,
  }));

  if (notifications.length > 0) {
    await Notification.insertMany(notifications);

    users.forEach(user => {
      broadcastToUser(user._id.toString(), {
        type: 'NOTIFICATION',
        data: { title, body, type: 'ANNOUNCEMENT', data },
      });
    });
  }

  return { sent_count: notifications.length };
};

module.exports = {
  createNotification,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getPreferences,
  updatePreferences,
  sendMatchNotification,
  sendPaymentNotification,
  sendWalletNotification,
  sendSecurityNotification,
  sendRewardNotification,
  sendPromotionNotification,
  sendBroadcast,
};
