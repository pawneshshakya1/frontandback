// Match credentials service — room-id / room-password lifecycle
// and viewer masking. The reveal / edit windows themselves live
// in utils/match-time.util; this module just applies them.

const Match = require('../models/match.model');
const { getCredentialsRevealTime, getMatchStartDateTime, canHostEditCredentials } = require('../utils/match-time.util');
const { broadcast, broadcastToUsers } = require('../utils/sse');

// Hide room_id / room_password from non-host viewers until the
// reveal window opens. Mutates `match` in-place (so the caller's
// Mongoose document picks up `credentials_visible`).
const maskCredentialsForViewer = (match, viewerUserId) => {
  if (!match) return match;
  const isHost =
    viewerUserId &&
    match.created_by &&
    match.created_by.toString() === viewerUserId.toString();
  if (isHost) {
    match.credentials_visible = true;
    return match;
  }
  const revealAt = getCredentialsRevealTime(match);
  const now = new Date();
  const withinRevealWindow = revealAt && now >= revealAt;
  if (!withinRevealWindow) {
    match.room_id = match.room_id ? '••••••' : null;
    match.room_password = match.room_password ? '••••••' : null;
    match.credentials_visible = false;
  } else {
    match.credentials_visible = true;
  }
  return match;
};

// Host sets room_id and room_password. Allowed from
// CREDENTIALS_EDIT_BEFORE_MIN minutes before match start up to
// CREDENTIALS_EDIT_AFTER_MIN minutes after start.
const setRoomCredentials = async (matchId, userId, { room_id, room_password }) => {
  const match = await Match.findById(matchId);
  if (!match) throw new Error('Match not found');
  if (match.created_by.toString() !== userId.toString()) {
    throw new Error('Not authorized to edit room credentials');
  }
  if (!match.isPublished) {
    throw new Error('Cannot set credentials for unpublished match');
  }
  if (match.status === 'CANCELLED') {
    throw new Error('Cannot set credentials for a cancelled match');
  }

  if (!room_id || !String(room_id).trim()) {
    throw new Error('Room ID is required');
  }

  if (!canHostEditCredentials(match)) {
    const start = getMatchStartDateTime(match);
    throw new Error(
      `Room credentials can only be edited from 10 minutes before ` +
      `to 5 minutes after the match start time ` +
      `(${start ? start.toLocaleString() : 'TBA'})`
    );
  }

  match.room_id = String(room_id).trim();
  match.room_password = room_password ? String(room_password).trim() : null;
  match.credentials_set_at = new Date();
  await match.save();

  const participantIds = match.participants.map((p) => p.user_id.toString());
  broadcastToUsers(participantIds, {
    type: 'CREDENTIALS_UPDATED',
    matchId: match._id.toString(),
  });
  broadcast({ type: 'MATCH_UPDATE', action: 'credentials', matchId: match._id.toString() });

  return match;
};

module.exports = {
  maskCredentialsForViewer,
  setRoomCredentials,
};
