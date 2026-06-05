/**
 * Push Notification Batch Scheduler Service
 * 
 * Supports two send modes:
 * - INSTANT: Sends immediately in batches (50 users / 5 sec default)
 * - SCHEDULED: Queues the job and sends at the specified date/time
 * 
 * Also supports optional image in notifications via FCM.
 */

const Notification = require('../models/notification.model');
const NotificationPreference = require('../models/notification-preference.model');
const UserSession = require('../models/user-session.model');
const User = require('../models/user.model');
const { broadcastToUser } = require('../utils/sse');

// In-memory job store
const jobs = new Map();

// ============ SCHEDULED JOB CHECKER (runs every 10 seconds) ============
setInterval(() => {
  const now = Date.now();
  for (const [jobId, job] of jobs) {
    if (job.status === 'scheduled' && job.scheduledAt && new Date(job.scheduledAt).getTime() <= now) {
      console.log(`[SCHEDULER] Picking up scheduled job: ${jobId} (was scheduled for ${job.scheduledAt})`);
      job.status = 'queued';
      processBroadcastJob(jobId).catch(err => {
        console.error(`[SCHEDULER] Job ${jobId} failed:`, err.message);
        job.status = 'failed';
        job.error = err.message;
        job.completedAt = new Date().toISOString();
      });
    }
  }
}, 10000);

/**
 * Create a new broadcast job
 * @param {Object} options
 * @param {string} options.sendMode - 'instant' or 'scheduled'
 * @param {string} options.scheduledAt - ISO date string (required if sendMode is 'scheduled')
 * @param {string} options.image - Optional image URL for the notification
 */
const createBroadcastJob = async ({
  title, body, target = 'all', batchSize = 50, batchDelay = 5000,
  data = {}, sendMode = 'instant', scheduledAt = null, image = null
}) => {
  // Build query based on target
  const userQuery = { account_status: 'ACTIVE' };
  if (target === 'partners') {
    userQuery.role = 'PARTNER';
  } else if (target === 'premium') {
    userQuery.verification_source = 'PREMIUM';
  }

  const totalUsers = await User.countDocuments(userQuery);

  if (totalUsers === 0) {
    return { error: 'No users found for the selected target' };
  }

  // Validate scheduledAt
  if (sendMode === 'scheduled') {
    if (!scheduledAt) {
      return { error: 'scheduledAt is required for scheduled mode' };
    }
    const scheduleDate = new Date(scheduledAt);
    if (isNaN(scheduleDate.getTime())) {
      return { error: 'Invalid scheduledAt date' };
    }
    if (scheduleDate.getTime() <= Date.now()) {
      return { error: 'Scheduled time must be in the future' };
    }
  }

  const jobId = `broadcast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const clampedBatchSize = Math.min(100, Math.max(10, batchSize));

  const job = {
    id: jobId,
    title,
    body,
    target,
    data,
    image: image || null,
    sendMode,
    scheduledAt: sendMode === 'scheduled' ? scheduledAt : null,
    batchSize: clampedBatchSize,
    batchDelay: Math.max(3000, batchDelay),
    totalUsers,
    sentCount: 0,
    failedCount: 0,
    dbSavedCount: 0,
    status: sendMode === 'scheduled' ? 'scheduled' : 'queued', // scheduled | queued | processing | completed | failed
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    currentBatch: 0,
    totalBatches: Math.ceil(totalUsers / clampedBatchSize),
    error: null,
  };

  jobs.set(jobId, job);

  // If instant, start processing immediately
  if (sendMode === 'instant') {
    processBroadcastJob(jobId).catch(err => {
      console.error(`[BROADCAST] Job ${jobId} failed:`, err.message);
      const j = jobs.get(jobId);
      if (j) {
        j.status = 'failed';
        j.error = err.message;
        j.completedAt = new Date().toISOString();
      }
    });
  }

  return {
    jobId,
    totalUsers,
    totalBatches: job.totalBatches,
    batchSize: job.batchSize,
    batchDelay: job.batchDelay,
    sendMode: job.sendMode,
    scheduledAt: job.scheduledAt,
  };
};

/**
 * Process a broadcast job in batches
 */
const processBroadcastJob = async (jobId) => {
  const job = jobs.get(jobId);
  if (!job) throw new Error('Job not found');

  job.status = 'processing';
  job.startedAt = new Date().toISOString();

  console.log(`[BROADCAST] Processing job ${jobId}: ${job.title} | Target: ${job.target} | Users: ${job.totalUsers} | Batches: ${job.totalBatches} | Image: ${job.image || 'none'}`);

  // Build user query
  const userQuery = { account_status: 'ACTIVE' };
  if (job.target === 'partners') {
    userQuery.role = 'PARTNER';
  } else if (job.target === 'premium') {
    userQuery.verification_source = 'PREMIUM';
  }

  // Process in batches
  let skip = 0;
  const batchSize = job.batchSize;

  while (skip < job.totalUsers) {
    const batchNum = Math.floor(skip / batchSize) + 1;
    job.currentBatch = batchNum;

    // Get batch of users
    const users = await User.find(userQuery)
      .select('_id')
      .skip(skip)
      .limit(batchSize);

    if (users.length === 0) break;

    const userIds = users.map(u => u._id);

    // Save notifications to DB for all users in this batch
    let savedCount = 0;
    try {
      const notifications = userIds.map(userId => ({
        user_id: userId,
        title: job.title,
        body: job.body,
        type: 'ANNOUNCEMENT',
        data: job.data || {},
      }));
      const saved = await Notification.insertMany(notifications, { ordered: false });
      savedCount = saved.length;
      job.dbSavedCount += savedCount;
      console.log(`[BROADCAST] Batch ${batchNum}: DB saved ${savedCount} notifications`);
    } catch (err) {
      console.error(`[BROADCAST] Batch ${batchNum} DB save error:`, err.message);
      // Fallback: save one by one
      for (const userId of userIds) {
        try {
          await Notification.create({
            user_id: userId,
            title: job.title,
            body: job.body,
            type: 'ANNOUNCEMENT',
            data: job.data || {},
          });
          savedCount++;
          job.dbSavedCount++;
        } catch (e) { /* skip individual failures */ }
      }
      console.log(`[BROADCAST] Batch ${batchNum}: Fallback saved ${savedCount} notifications`);
    }

    // Send SSE (real-time in-app) to all users in this batch
    let sseCount = 0;
    for (const userId of userIds) {
      try {
        broadcastToUser(userId.toString(), {
          type: 'NOTIFICATION',
          data: {
            _id: `broadcast_${jobId}_${userId}`,
            title: job.title,
            body: job.body,
            type: 'ANNOUNCEMENT',
            image: job.image || undefined,
            data: job.data || {},
            isRead: false,
            createdAt: new Date().toISOString(),
          },
        });
        sseCount++;
      } catch (err) { /* ignore SSE errors */ }
    }
    console.log(`[BROADCAST] Batch ${batchNum}: SSE sent to ${sseCount} connected users`);

    // Get FCM tokens for this batch of users
    const sessions = await UserSession.find({
      user_id: { $in: userIds },
      fcm_tokens: { $exists: true, $ne: [] },
    }).select('user_id fcm_tokens');

    // Collect all valid tokens
    const allTokens = [];

    for (const session of sessions) {
      try {
        const prefs = await NotificationPreference.getOrCreate(session.user_id);
        if (prefs.push_enabled) {
          for (const token of session.fcm_tokens) {
            if (token && token.trim()) {
              allTokens.push(token);
            }
          }
        }
      } catch (err) {
        for (const token of session.fcm_tokens) {
          if (token && token.trim()) {
            allTokens.push(token);
          }
        }
      }
    }

    console.log(`[BROADCAST] Batch ${batchNum}: Found ${sessions.length} sessions with FCM tokens, ${allTokens.length} total tokens`);

    // Send FCM push to this batch (with optional image)
    if (allTokens.length > 0) {
      try {
        const result = await sendBatchFCM(allTokens, job.title, job.body, {
          ...job.data,
          type: 'ANNOUNCEMENT',
        }, job.image);
        job.sentCount += result.successCount;
        job.failedCount += result.failureCount;

        // Cleanup failed tokens
        if (result.failedTokens && result.failedTokens.length > 0) {
          for (const token of result.failedTokens) {
            try {
              await UserSession.updateMany({}, { $pull: { fcm_tokens: token } });
            } catch (e) { /* ignore */ }
          }
        }
      } catch (err) {
        console.error(`Batch ${batchNum} FCM error:`, err.message);
        job.failedCount += allTokens.length;
      }
    } else {
      console.log(`[BROADCAST] Batch ${batchNum}: No FCM tokens found — skipping push (users on Expo Go or no tokens registered)`);
    }

    skip += batchSize;

    // Wait before next batch (except for last batch)
    if (skip < job.totalUsers) {
      await sleep(job.batchDelay);
    }
  }

  job.status = 'completed';
  job.completedAt = new Date().toISOString();
  console.log(`[BROADCAST] Job ${jobId} COMPLETED:`);
  console.log(`  - DB Notifications saved: ${job.dbSavedCount}`);
  console.log(`  - FCM Push sent: ${job.sentCount}`);
  console.log(`  - FCM Push failed: ${job.failedCount}`);
  console.log(`  - Total users: ${job.totalUsers}`);
  if (job.dbSavedCount > 0 && job.sentCount === 0) {
    console.log(`  - NOTE: Notifications saved to DB. FCM=0 means no device tokens registered (Expo Go?).`);
    console.log(`  - Users will see notifications when they open the notifications screen.`);
  }
};

/**
 * Send FCM push to a batch of tokens (with optional image)
 */
const sendBatchFCM = async (tokens, title, body, data = {}, image = null) => {
  try {
    const { admin } = require('../config/firebase');

    if (!admin || !admin.apps.length) {
      console.warn('Firebase Admin not initialized, skipping push');
      return { successCount: 0, failureCount: tokens.length, failedTokens: tokens };
    }

    const FIREBASE_LIMIT = 500;
    let totalSuccess = 0;
    let totalFailure = 0;
    const allFailedTokens = [];

    for (let i = 0; i < tokens.length; i += FIREBASE_LIMIT) {
      const chunk = tokens.slice(i, i + FIREBASE_LIMIT);

      // Build notification payload with optional image
      const notificationPayload = { title, body };
      if (image) {
        notificationPayload.image = image;
      }

      const message = {
        notification: notificationPayload,
        data: Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v)])
        ),
        // For Android, also set the image in the android config
        ...(image ? {
          android: {
            notification: {
              image,
            },
          },
          // For iOS, set the image in apns config
          apns: {
            payload: {
              aps: {
                'mutable-content': 1,
                'content-available': 1,
              },
            },
            fcm_options: {
              image,
            },
          },
        } : {}),
        tokens: chunk,
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      totalSuccess += response.successCount;
      totalFailure += response.failureCount;

      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            allFailedTokens.push(chunk[idx]);
            console.error('FCM push failed:', resp.error?.message);
          }
        });
      }
    }

    return {
      successCount: totalSuccess,
      failureCount: totalFailure,
      failedTokens: allFailedTokens,
    };
  } catch (error) {
    console.error('FCM batch send error:', error.message);
    throw error;
  }
};

/**
 * Get job status
 */
const getJobStatus = (jobId) => {
  const job = jobs.get(jobId);
  if (!job) return null;

  const elapsed = job.startedAt
    ? Math.floor((new Date(job.completedAt || Date.now()) - new Date(job.startedAt)) / 1000)
    : 0;

  const progress = job.totalUsers > 0
    ? Math.round(((job.sentCount + job.failedCount) / job.totalUsers) * 100)
    : 0;

  let estimatedRemaining = 0;
  if (job.status === 'processing' && job.sentCount + job.failedCount > 0) {
    const ratePerSecond = (job.sentCount + job.failedCount) / Math.max(1, elapsed);
    const remaining = job.totalUsers - job.sentCount - job.failedCount;
    estimatedRemaining = Math.ceil(remaining / Math.max(1, ratePerSecond));
  }

  // For scheduled jobs, calculate countdown
  let countdown = 0;
  if (job.status === 'scheduled' && job.scheduledAt) {
    countdown = Math.max(0, Math.floor((new Date(job.scheduledAt).getTime() - Date.now()) / 1000));
  }

  return {
    id: job.id,
    title: job.title,
    body: job.body,
    target: job.target,
    image: job.image,
    sendMode: job.sendMode,
    scheduledAt: job.scheduledAt,
    status: job.status,
    totalUsers: job.totalUsers,
    sentCount: job.sentCount,
    failedCount: job.failedCount,
    dbSavedCount: job.dbSavedCount,
    currentBatch: job.currentBatch,
    totalBatches: job.totalBatches,
    progress,
    elapsed,
    estimatedRemaining,
    countdown,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    error: job.error,
  };
};

/**
 * Get all jobs
 */
const getAllJobs = () => {
  return Array.from(jobs.values()).map(job => getJobStatus(job.id));
};

/**
 * Cancel a job (only if queued or scheduled)
 */
const cancelJob = (jobId) => {
  const job = jobs.get(jobId);
  if (!job) return { error: 'Job not found' };
  if (job.status !== 'queued' && job.status !== 'scheduled') {
    return { error: 'Can only cancel queued or scheduled jobs' };
  }
  job.status = 'cancelled';
  job.completedAt = new Date().toISOString();
  return { success: true };
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  createBroadcastJob,
  getJobStatus,
  getAllJobs,
  cancelJob,
};
