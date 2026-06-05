// Admin match controller — list / inspect / edit / status-change /
// publish-toggle / room-details / bulk-action / per-match analytics
// plus the three admin-side event creators (sponsored, premium, standard).

const Match = require("../models/match.model");
const Transaction = require("../models/transaction.model");
const notificationService = require("../services/notification.service");
const walletService = require("../services/wallet.service");
const { broadcast } = require("../utils/sse");

const getMatches = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const query = {};
    if (status) query.status = status;

    const total = await Match.countDocuments(query);
    const totalPages = Math.ceil(total / limitNum);
    const matches = await Match.find(query)
      .populate("created_by", "username email")
      .sort("-createdAt")
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    res.json({
      success: true,
      data: matches,
      pagination: { page: pageNum, limit: limitNum, total, totalPages },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getMatchById = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id).populate(
      "created_by",
      "username email",
    );
    if (!match)
      return res
        .status(404)
        .json({ success: false, message: "Match not found" });
    res.json({ success: true, data: match });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateMatch = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const match = await Match.findById(id);
    if (!match)
      return res
        .status(404)
        .json({ success: false, message: "Match not found" });

    if (match.isPublished) {
      return res.status(400).json({
        success: false,
        message: "Published event cannot be edited. Unpublish first or use room details endpoint.",
      });
    }

    const updatedMatch = await Match.findByIdAndUpdate(id, updates, {
      new: true,
    });
    res.json({ success: true, data: updatedMatch });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteMatch = async (req, res) => {
  try {
    const { id } = req.params;
    const match = await Match.findById(id);
    if (!match)
      return res
        .status(404)
        .json({ success: false, message: "Match not found" });

    if (match.isPublished) {
      return res.status(400).json({
        success: false,
        message: "Published event cannot be deleted. Unpublish first.",
      });
    }

    await Match.findByIdAndDelete(id);
    res.json({ success: true, message: "Match deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateMatchStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['OPEN', 'ONGOING', 'COMPLETED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const match = await Match.findById(id);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    const oldStatus = match.status;
    match.status = status;

    if (status === 'COMPLETED' && oldStatus !== 'COMPLETED') {
      const participantIds = match.participants.map(p => p.user_id);
      const prizePerPlayer = match.participants.length > 0
        ? match.prize_pool / match.participants.length
        : 0;
      const prizeResults = await Promise.allSettled(
        participantIds.map((userId) =>
          walletService.awardPrize(userId, prizePerPlayer, match._id)
        )
      );
      prizeResults.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.error(`Prize distribution error for ${participantIds[i]}:`, r.reason);
        }
      });
    }

    if (status === 'CANCELLED' && oldStatus !== 'CANCELLED') {
      const refundResults = await Promise.allSettled(
        match.participants.map((participant) =>
          walletService.unlockFunds(
            participant.user_id,
            match.entry_fee,
            match._id,
            'Match cancelled - entry fee refunded'
          )
        )
      );
      refundResults.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.error(`Refund error for ${match.participants[i].user_id}:`, r.reason);
        }
      });
    }

    await match.save();

    broadcast({ type: 'MATCH_UPDATE', action: 'status_change', matchId: id, status });

    res.json({ success: true, message: `Match status updated to ${status}`, data: match });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const togglePublish = async (req, res) => {
  try {
    const { id } = req.params;
    const match = await Match.findById(id);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    if (!match.isPublished) {
      match.isPublished = true;
      if (match.status === 'DRAFT') {
        match.status = 'OPEN';
      }
      await match.save();

      const eventType = match.is_sponsored ? 'Sponsored' : match.is_premium ? 'Premium' : 'Standard';
      const notifTitle = `New ${eventType} Tournament: ${match.title}`;
      const notifBody = `A new ${eventType} tournament "${match.title}" is now open! Entry Fee: ₹${match.entry_fee}, Prize Pool: ₹${match.prize_pool}. Join now!`;
      await notificationService.sendBroadcast(notifTitle, notifBody, {
        matchId: match._id.toString(),
        eventType: match.is_sponsored ? 'sponsored' : match.is_premium ? 'premium' : 'standard',
      });

      broadcast({ type: 'MATCH_UPDATE', action: 'publish', matchId: id, eventType: match.is_sponsored ? 'sponsored' : match.is_premium ? 'premium' : 'standard' });

      return res.json({ success: true, message: `Event published successfully! Notification sent to all users.`, data: match });
    }

    match.isPublished = false;
    match.status = 'DRAFT';
    await match.save();

    broadcast({ type: 'MATCH_UPDATE', action: 'unpublish', matchId: id });

    res.json({ success: true, message: `Event unpublished and set to DRAFT`, data: match });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const addRoomDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { room_id, room_password } = req.body;

    const match = await Match.findById(id);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    if (!match.isPublished) {
      return res.status(400).json({ success: false, message: 'Event must be published before adding room details' });
    }

    match.room_id = room_id;
    match.room_password = room_password;
    await match.save();

    if (match.participants && match.participants.length > 0) {
      for (const participant of match.participants) {
        try {
          await notificationService.createNotification(
            participant.user_id,
            '🎮 Room Details Available — Join Now!',
            `Room ID: ${room_id}${room_password ? `, Password: ${room_password}` : ''} for "${match.title}". Please join the game!`,
            'MATCH_UPDATE',
            { matchId: match._id.toString(), room_id, action: 'room_details_available' }
          );
        } catch (err) {
          console.error('Notification error:', err);
        }
      }
    }

    broadcast({ type: 'MATCH_UPDATE', action: 'room_details', matchId: id });

    res.json({ success: true, message: `Room details added. Notifications sent to ${match.participants.length} participant(s).`, data: match });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateRoomDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { room_id, room_password } = req.body;

    if (!room_id) {
      return res.status(400).json({ success: false, message: 'Room ID is required' });
    }

    const match = await Match.findById(id);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (!match.isPublished) {
      return res.status(400).json({ success: false, message: 'Event must be published to update room details' });
    }

    if (match.match_date && match.match_time) {
      const matchDateTime = new Date(`${match.match_date}T${match.match_time}`);
      const now = new Date();
      const timeDiff = matchDateTime.getTime() - now.getTime();
      const fifteenMinutesMs = 15 * 60 * 1000;

      if (timeDiff > fifteenMinutesMs) {
        const minutesLeft = Math.floor(timeDiff / 60000);
        return res.status(400).json({
          success: false,
          message: `Room details can only be updated within 15 minutes of match start. ${minutesLeft} minutes remaining.`,
          data: { matchDateTime, minutesRemaining: minutesLeft }
        });
      }
    }

    match.room_id = room_id;
    if (room_password !== undefined) {
      match.room_password = room_password;
    }
    await match.save();

    if (match.participants && match.participants.length > 0) {
      for (const participant of match.participants) {
        try {
          await notificationService.createNotification(
            participant.user_id,
            '🎮 Room Details Available — Join Now!',
            `Room ID: ${room_id}${room_password ? `, Password: ${room_password}` : ''} for "${match.title}". Please join the game!`,
            'MATCH_UPDATE',
            { matchId: match._id.toString(), room_id, action: 'room_details_updated' }
          );
        } catch (err) {
          console.error('Notification error:', err);
        }
      }
    }

    broadcast({ type: 'MATCH_UPDATE', action: 'room_details_updated', matchId: id });

    res.json({
      success: true,
      message: `Room details updated. Notifications sent to ${match.participants.length} participant(s).`,
      data: match
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const bulkAction = async (req, res) => {
  try {
    const { action, matchIds } = req.body;

    if (!action || !matchIds || !Array.isArray(matchIds)) {
      return res.status(400).json({ success: false, message: 'Invalid request' });
    }

    const results = [];
    for (const id of matchIds) {
      try {
        const match = await Match.findById(id);
        if (!match) {
          results.push({ id, success: false, message: 'Not found' });
          continue;
        }

        switch (action) {
          case 'publish':
            match.isPublished = true;
            break;
          case 'unpublish':
            match.isPublished = false;
            break;
          case 'cancel':
            if (match.status !== 'CANCELLED' && match.participants.length > 0) {
              const refundResults = await Promise.allSettled(
                match.participants.map((participant) =>
                  walletService.unlockFunds(
                    participant.user_id,
                    match.entry_fee,
                    match._id,
                    'Bulk cancel - entry fee refunded'
                  )
                )
              );
              refundResults.forEach((r, i) => {
                if (r.status === 'rejected') {
                  console.error(`Bulk refund error for ${match.participants[i].user_id}:`, r.reason);
                }
              });
            }
            match.status = 'CANCELLED';
            break;
          case 'delete':
            await Match.findByIdAndDelete(id);
            results.push({ id, success: true, message: 'Deleted' });
            continue;
          default:
            results.push({ id, success: false, message: 'Invalid action' });
            continue;
        }

        await match.save();
        results.push({ id, success: true, message: `${action} successful` });
      } catch (err) {
        results.push({ id, success: false, message: err.message });
      }
    }

    broadcast({ type: 'MATCH_UPDATE', action: 'bulk_action', actionType: action });

    res.json({ success: true, message: `Bulk ${action} completed`, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getMatchAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    const match = await Match.findById(id).populate('participants.user_id', 'username email');
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    const entryFeeRevenue = match.participants.length * match.entry_fee;

    const paymentBreakdown = await Transaction.aggregate([
      { $match: { match_id: match._id } },
      { $group: { _id: '$type', count: { $sum: 1 }, total: { $sum: '$amount' } } }
    ]);

    res.json({
      success: true,
      data: {
        match,
        totalRegistrations: match.participants.length,
        revenueGenerated: entryFeeRevenue,
        paymentBreakdown
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// -------- admin event creators (sponsored / premium / standard) --------

const _buildEventData = (reqBody, flags) => {
  const {
    title = '',
    banner_url = '',
    game_type = 'BR',
    mode = '',
    max_players = 52,
    map = 'BERMUDA',
    room_id = '',
    room_password = '',
    entry_fee = 0,
    prize_pool = 0,
    match_date = '',
    match_time = '',
    mediator_email = '',
    standard_restrictions = {},
    additional_rules = '',
    sponsor_details = {},
    latitude = null,
    longitude = null,
    isPublished,
  } = reqBody;

  const data = {
    created_by: reqBody._adminId,
    title, banner_url, game_type, mode, max_players, map,
    room_id, room_password,
    entry_fee: parseFloat(entry_fee) || 0,
    prize_pool: parseFloat(prize_pool) || 0,
    match_date, match_time, mediator_email,
    standard_restrictions: {
      no_grenades: standard_restrictions?.no_grenades ?? true,
      sniper_only: standard_restrictions?.sniper_only ?? false,
      no_vehicles: standard_restrictions?.no_vehicles ?? true,
      skills_off: standard_restrictions?.skills_off ?? false,
      disqualified_on_hack: standard_restrictions?.disqualified_on_hack ?? true,
      non_refundable: standard_restrictions?.non_refundable ?? true,
    },
    additional_rules,
    is_sponsored: flags.is_sponsored,
    is_premium: flags.is_premium,
    isPublished: isPublished !== undefined ? isPublished : false,
    status: 'DRAFT',
  };
  if (flags.is_sponsored) data.sponsor_details = sponsor_details;
  if (latitude && longitude) {
    data.location = {
      type: 'Point',
      coordinates: [parseFloat(longitude), parseFloat(latitude)],
    };
  }
  return data;
};

const createSponsoredEvent = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    const eventData = _buildEventData({ ...req.body, _adminId: req.user._id }, { is_sponsored: true, is_premium: false });
    const newEvent = new Match(eventData);
    await newEvent.save();
    broadcast({ type: 'MATCH_UPDATE', action: 'create', matchId: newEvent._id.toString(), eventType: 'sponsored' });
    res.json({
      success: true,
      message: 'Sponsored event created as DRAFT. Publish when ready.',
      data: newEvent,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createPremiumEvent = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    const eventData = _buildEventData({ ...req.body, _adminId: req.user._id }, { is_sponsored: false, is_premium: true });
    const newEvent = new Match(eventData);
    await newEvent.save();
    broadcast({ type: 'MATCH_UPDATE', action: 'create', matchId: newEvent._id.toString(), eventType: 'premium' });
    res.json({
      success: true,
      message: 'Premium event created as DRAFT. Publish when ready.',
      data: newEvent,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createStandardEvent = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    const eventData = _buildEventData({ ...req.body, _adminId: req.user._id }, { is_sponsored: false, is_premium: false });
    const newEvent = new Match(eventData);
    await newEvent.save();
    broadcast({ type: 'MATCH_UPDATE', action: 'create', matchId: newEvent._id.toString(), eventType: 'standard' });
    res.json({
      success: true,
      message: 'Standard event created as DRAFT. Publish when ready.',
      data: newEvent,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMatches,
  getMatchById,
  updateMatch,
  deleteMatch,
  updateMatchStatus,
  togglePublish,
  addRoomDetails,
  updateRoomDetails,
  bulkAction,
  getMatchAnalytics,
  createSponsoredEvent,
  createPremiumEvent,
  createStandardEvent,
};
