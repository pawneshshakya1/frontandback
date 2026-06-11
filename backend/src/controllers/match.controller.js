const matchService = require('../services/match.service');
const sseService = require('../services/sse.service');
const STATUS_CODES = require('../utils/statusCodes');

const notificationService = require('../services/notification.service');

const create = async (req, res) => {
  try {
    const match = await matchService.createMatch(req.user.id, req.body);

    // Send notification if event is published
    if (match.isPublished) {
      await notificationService.createNotification(
        req.user.id,
        "Event Published",
        `Your event "${match.title}" has been successfully created and published.`,
        'EVENT',
        { matchId: match._id.toString() },
        req.user.id
      );
    }

    res.status(STATUS_CODES.CREATED).json({ success: true, data: match });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const join = async (req, res) => {
  try {
    const { roomId, paymentMethod, cashfreeDetails } = req.body;
    const match = await matchService.joinMatch(req.user.id, roomId, paymentMethod || 'WALLET');
    res.json({ success: true, data: match });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const joinByMatchId = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod, cashfreeDetails } = req.body;
    const match = await matchService.joinMatchById(req.user.id, id, paymentMethod || 'WALLET');
    res.json({ success: true, data: match });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const leave = async (req, res) => {
  try {
    const { roomId } = req.body;
    const match = await matchService.leaveMatch(req.user.id, roomId);
    res.json({ success: true, data: match });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const initiatePayment = async (req, res) => {
  try {
    const { matchId, paymentMethod, cashfreeDetails } = req.body;
    const result = await matchService.initiateMatchPayment(
      req.user.id,
      matchId,
      paymentMethod,
      cashfreeDetails
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const confirmCashfreeJoin = async (req, res) => {
  try {
    const { matchId, orderId } = req.body;
    const result = await matchService.confirmCashfreeJoin(req.user.id, matchId, orderId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const getMatch = async (req, res) => {
  try {
    const match = await matchService.getMatch(req.params.id, req.user); // Pass user for visibility checks
    res.json({ success: true, data: match });
  } catch (error) {
    res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: 'Match not found' });
  }
};

const getMatches = async (req, res) => {
  try {
    const { latitude, longitude, featured } = req.query;
    const currentUserId = req.user ? req.user.id : null;
    const matches = await matchService.getAllMatches({ latitude, longitude, featured }, currentUserId);
    res.json({ success: true, data: matches });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const getJoinedMatches = async (req, res) => {
  try {
    const matches = await matchService.getJoinedMatches(req.user.id);
    res.json({ success: true, data: matches });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const getCreatedMatches = async (req, res) => {
  try {
    const matches = await matchService.getCreatedMatches(req.user.id);
    res.json({ success: true, data: matches });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const sseStream = (req, res) => {
  const { matchId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseService.addClient(matchId, res);
};

const submitResult = async (req, res) => {
  try {
    const { id } = req.params;
    const match = await matchService.submitResult(id, req.user.id, req.body);
    res.json({ success: true, data: match });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const approveResult = async (req, res) => {
  try {
    const { id } = req.params;
    const match = await matchService.approveResult(id, req.user.id);
    res.json({ success: true, data: match });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const checkMediatorStatus = async (req, res) => {
  try {
    const isMediator = await matchService.checkMediatorStatus(req.user);
    res.json({ success: true, isMediator });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const getMediatorMatches = async (req, res) => {
  try {
    const matches = await matchService.getMediatorMatches(req.user);
    res.json({ success: true, data: matches });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const update = async (req, res) => {
  try {
    // B4 fix: use req.user.id consistently. The auth middleware sets
    // req.userId = req.user._id.toString() AND req.user is the full
    // Mongoose doc. Use the canonical req.user.id (virtual) or
    // req.userId string. Mixing _id / id caused subtle bugs.
    const userId = req.userId || (req.user && req.user.id);
    const match = await matchService.updateMatch(req.params.id, userId, req.body);
    res.json({ success: true, data: match });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const userId = req.userId || (req.user && req.user.id);
    await matchService.deleteMatch(req.params.id, userId);
    res.json({ success: true, message: 'Match deleted' });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const User = require('../models/user.model');

const getDailyLimit = async (req, res) => {
  try {
    // B4 fix: use req.userId (set by auth middleware) — avoids a
    // round-trip to fetch the full user just to read .role.
    const userId = req.userId;
    const user = await User.findById(userId).select('role pass_type pass_expiry pass_event_count pass_events_used').lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Admins and Partners have unlimited
    if (user.role === 'ADMIN' || user.role === 'PARTNER') {
      return res.json({
        success: true,
        data: {
          pass_type: user.role.toLowerCase(),
          daily_limit: -1, // unlimited
          today_count: 0,
          remaining: -1,
          is_unlimited: true,
          total_limit: -1,
          total_used: 0,
          total_remaining: -1,
          limit_type: 'unlimited'
        }
      });
    }

    // Check if user has an active UserPass (Elite Pass)
    const UserPass = require('../models/user-pass.model');
    const activePass = await UserPass.findOne({
      user_id: user._id,
      status: 'ACTIVE',
      expires_at: { $gt: new Date() },
    }).sort({ expires_at: -1 }).lean();

    // Fallback: if no UserPass record but User model has pass_type + pass_expiry
    // (handles old purchases made before UserPass tracking was added)
    const hasUserModelPass = user.pass_type
      && user.pass_type !== 'none'
      && user.pass_expiry
      && new Date(user.pass_expiry) > new Date()
      && user.pass_event_count;

    if (!activePass && !hasUserModelPass) {
      // No active pass - use default daily limit
      const dailyLimit = 1; // default for 'none'
      const todayCount = await matchService.getDailyEventCount(req.user.id);
      return res.json({
        success: true,
        data: {
          pass_type: 'none',
          daily_limit: dailyLimit,
          today_count: todayCount,
          remaining: Math.max(0, dailyLimit - todayCount),
          is_unlimited: false,
          total_limit: null,
          total_used: 0,
          total_remaining: null,
          limit_type: 'daily',
          pass_expiry: null
        }
      });
    }

    const passType = activePass ? activePass.pass_type : user.pass_type;
    const limits = await matchService.getPassLimits();
    const dailyLimit = limits.daily[passType] || 1;
    const todayCount = await matchService.getDailyEventCount(req.user.id);

    // Get total event limit for Elite Pass holders
    const totalLimitInfo = await matchService.getTotalEventLimit(req.user.id);

    // Determine which limit to use: total for Elite Pass (has passConfig), daily for others
    const passConfig = limits.passConfig[passType];
    const isEliteUser = passConfig && (user.pass_event_count || hasUserModelPass);
    const limitType = isEliteUser ? 'total' : 'daily';
    
    const remaining = isEliteUser 
      ? (totalLimitInfo?.remaining ?? 0)
      : Math.max(0, dailyLimit - todayCount);

    res.json({
      success: true,
      data: {
        pass_type: passType,
        daily_limit: dailyLimit,
        today_count: todayCount,
        remaining: remaining,
        is_unlimited: false,
        // Total event limit info (for Elite Pass holders)
        total_limit: totalLimitInfo?.total_limit ?? null,
        total_used: totalLimitInfo?.used ?? 0,
        total_remaining: totalLimitInfo?.remaining ?? null,
        limit_type: limitType,
        pass_expiry: user.pass_expiry || null,
        pass_name: limits.passConfig[passType]?.name || null,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const cancelEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const { match, refundResults } = await matchService.cancelMatch(id, req.user.id, reason);
    res.json({
      success: true,
      data: match,
      refundResults: refundResults || null,
    });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const shareEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await matchService.shareMatch(id, req.user.id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const joinByCode = async (req, res) => {
  try {
    const { invite_code } = req.body;
    if (!invite_code) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'invite_code is required' });
    }
    const match = await matchService.joinByInviteCode(req.user.id, invite_code);
    res.json({ success: true, data: match });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const getEventByShareToken = async (req, res) => {
  try {
    const { token } = req.params;
    const match = await matchService.getMatchByShareToken(token);
    res.json({ success: true, data: match });
  } catch (error) {
    res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: error.message });
  }
};

const submitParticipantResult = async (req, res) => {
  try {
    const { id } = req.params;
    const match = await matchService.submitParticipantResult(id, req.user.id, req.body);
    res.json({ success: true, data: match });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const aiAnalyze = async (req, res) => {
  try {
    const { id } = req.params;
    const match = await matchService.analyzeResultsWithAI(id, req.user.id);
    res.json({ success: true, data: match });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const rejectResult = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const match = await matchService.rejectResult(id, req.user.id, reason);
    res.json({ success: true, data: match });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const selectWinner = async (req, res) => {
  try {
    const { id } = req.params;
    const { winner_user_id } = req.body;
    if (!winner_user_id) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'winner_user_id is required' });
    }
    const match = await matchService.selectWinner(id, req.user.id, winner_user_id);
    res.json({ success: true, data: match });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const getDrafts = async (req, res) => {
  try {
    const drafts = await matchService.getDrafts(req.user.id);
    res.json({ success: true, data: drafts });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const getInvites = async (req, res) => {
  try {
    const invites = await matchService.getInvites(req.user.id);
    res.json({ success: true, data: invites });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const publishDraft = async (req, res) => {
  try {
    const { id } = req.params;
    const match = await matchService.publishDraft(id, req.user.id);
    res.json({ success: true, data: match });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const setRoomCredentials = async (req, res) => {
  try {
    const { id } = req.params;
    const { room_id, room_password } = req.body;
    const match = await matchService.setRoomCredentials(id, req.user.id, {
      room_id,
      room_password,
    });
    res.json({ success: true, data: match });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

module.exports = {
  create,
  join,
  leave,
  initiatePayment,
  confirmCashfreeJoin,
  getMatch,
  getMatches,
  getJoinedMatches,
  getCreatedMatches,
  sseStream,
  submitResult,
  approveResult,
  checkMediatorStatus,
  getMediatorMatches,
  update,
  remove,
  getDailyLimit,
  cancelEvent,
  shareEvent,
  joinByCode,
  getEventByShareToken,
  submitParticipantResult,
  aiAnalyze,
  rejectResult,
  selectWinner,
  getDrafts,
  getInvites,
  publishDraft,
  setRoomCredentials,
  joinByMatchId
};
