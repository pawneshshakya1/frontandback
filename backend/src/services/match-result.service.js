// Match result service — submit / approve / reject / AI-analyse /
// select-winner flows. Depends on the lifecycle service for
// checkMatchStatus so status transitions stay in one place.

const Match = require('../models/match.model');
const walletService = require('./wallet.service');
const lifecycle = require('./match-lifecycle.service');
const { broadcast, broadcastToUser, broadcastToUsers } = require('../utils/sse');

// Minutes a participant has to upload their screenshot after the
// match goes ONGOING. Configurable per-match via ss_upload_deadline_minutes.
const SS_UPLOAD_DEADLINE_MIN = 2;

// Additional minutes the mediator has to declare a winner after the
// SS upload deadline passes.
const RESULT_DECLARATION_DEADLINE_MIN = 5;

const submitResult = async (matchId, userId, resultData) => {
  const match = await Match.findById(matchId);
  if (!match) throw new Error('Match not found');

  if (match.created_by.toString() !== userId.toString()) {
    throw new Error('Only creator can submit results');
  }

  await lifecycle.checkMatchStatus(match);

  match.results = {
    submitted_by: userId, kills: resultData.kills, damage: resultData.damage,
    screenshot_urls: resultData.screenshot_urls, submitted_at: Date.now(),
  };
  match.status = 'REVIEW';
  await match.save();

  broadcast({ type: 'MATCH_UPDATE', action: 'result_submitted', matchId: match._id.toString(), status: match.status });

  return match;
};

const approveResult = async (matchId, mediatorId) => {
  const match = await Match.findById(matchId);
  if (!match) throw new Error('Match not found');
  if (match.status !== 'REVIEW') throw new Error('Match not pending review');

  if (!match.mediator_user_id || match.mediator_user_id.toString() !== String(mediatorId)) {
    throw new Error('Only the assigned mediator can approve this result');
  }

  if (!match.winner_id) throw new Error('Winner must be assigned before approving payout');
  const winnerId = match.winner_id;
  const prize = match.prize_pool;

  await walletService.awardPrize(winnerId, prize);

  match.status = 'COMPLETED';
  await match.save();

  broadcast({ type: 'MATCH_UPDATE', action: 'completed', matchId: match._id.toString(), status: match.status });

  return match;
};

const checkMediatorStatus = async (user) => {
  const isMediator = await Match.exists({
    $or: [
      { mediator_email: user.email.toLowerCase() },
      { mediator_user_id: user.id },
    ],
  });
  return !!isMediator;
};

const getMediatorMatches = async (user) => {
  const matches = await Match.find({
    $or: [
      { mediator_email: user.email.toLowerCase() },
      { mediator_user_id: user.id },
    ],
  }).sort('-createdAt');

  await Promise.all(matches.map(async (m) => { await lifecycle.checkMatchStatus(m); }));
  return matches;
};

const submitParticipantResult = async (matchId, userId, resultData) => {
  const match = await Match.findById(matchId);
  if (!match) throw new Error('Match not found');

  const isParticipant = match.participants.some(
    p => p.user_id.toString() === userId.toString()
  );
  if (!isParticipant) throw new Error('Only participants can submit results');

  if (match.ss_upload_expires_at && new Date() > new Date(match.ss_upload_expires_at)) {
    throw new Error('Screenshot upload deadline has passed');
  }

  match.participant_results = match.participant_results.filter(
    r => r.user_id.toString() !== userId.toString()
  );

  match.participant_results.push({
    user_id: userId,
    kills: resultData.kills || 0,
    damage: resultData.damage || 0,
    placement: resultData.placement || 0,
    score: resultData.score || 0,
    screenshot_urls: resultData.screenshot_urls || [],
    submitted_at: new Date(),
  });

  if (!match.ss_upload_expires_at) {
    match.ss_upload_expires_at = new Date(
      Date.now() + match.ss_upload_deadline_minutes * 60 * 1000
    );
  }
  if (!match.result_declaration_expires_at && match.mediator_user_id) {
    match.result_declaration_expires_at = new Date(
      Date.now() + (match.ss_upload_deadline_minutes + match.result_declaration_deadline_minutes) * 60 * 1000
    );
  }

  await match.save();

  if (match.mediator_user_id) {
    broadcastToUser(match.mediator_user_id.toString(), {
      type: 'PARTICIPANT_RESULT_SUBMITTED',
      matchId: match._id.toString(),
      user_id: userId,
    });
  }
  broadcastToUser(match.created_by.toString(), {
    type: 'SS_UPLOADED',
    matchId: match._id.toString(),
    user_id: userId,
  });

  return match;
};

const analyzeResultsWithAI = async (matchId, userId) => {
  const match = await Match.findById(matchId);
  if (!match) throw new Error('Match not found');
  if (match.created_by.toString() !== userId.toString()) {
    throw new Error('Not authorized');
  }
  if (!match.participant_results || match.participant_results.length === 0) {
    throw new Error('No results to analyze');
  }

  // Score formula: kills * 100 + damage * 0.5 + (max_players - placement + 1) * 50
  const scored = match.participant_results.map(r => {
    const placementScore = r.placement > 0
      ? (match.max_players - r.placement + 1) * 50
      : 0;
    const finalScore = (r.kills * 100) + (r.damage * 0.5) + placementScore;
    return { ...r.toObject(), computedScore: finalScore };
  });

  scored.sort((a, b) => b.computedScore - a.computedScore);
  const winner = scored[0];

  match.ai_verdict = {
    winner_user_id: winner.user_id,
    confidence: Math.min(0.95, 0.6 + (scored.length > 1 ? 0.35 / scored.length : 0.3)),
    reasoning: `Based on ${scored.length} submission(s), ${winner.user_id} has the highest computed score (${Math.round(winner.computedScore)}) from kills, damage, and placement.`,
    generated_at: new Date(),
  };
  match.winner_id = winner.user_id;
  match.status = 'REVIEW';
  await match.save();

  broadcastToUser(match.mediator_user_id?.toString() || match.created_by.toString(), {
    type: 'MATCH_AI_VERDICT_READY',
    matchId: match._id.toString(),
    winner_id: match.winner_id,
    confidence: match.ai_verdict.confidence,
  });

  return match;
};

const rejectResult = async (matchId, mediatorId, reason) => {
  const match = await Match.findById(matchId);
  if (!match) throw new Error('Match not found');
  if (!match.mediator_user_id || match.mediator_user_id.toString() !== mediatorId.toString()) {
    throw new Error('Only assigned mediator can reject');
  }
  if (match.status !== 'REVIEW') throw new Error('Match not in review');

  match.status = 'ONGOING';
  match.mediator_reject_reason = reason || 'Result rejected by mediator';
  match.rejected_by = mediatorId;
  match.rejected_at = new Date();
  match.ss_upload_expires_at = new Date(
    Date.now() + match.ss_upload_deadline_minutes * 60 * 1000
  );
  match.participant_results = [];
  match.ai_verdict = { winner_user_id: null, confidence: 0, reasoning: null, generated_at: null };
  await match.save();

  const participantIds = match.participants.map(p => p.user_id.toString());
  broadcastToUsers(participantIds, {
    type: 'MATCH_RESULT_REJECTED',
    matchId: match._id.toString(),
    reason: match.mediator_reject_reason,
    new_deadline: match.ss_upload_expires_at,
  });
  broadcastToUser(match.created_by.toString(), {
    type: 'MATCH_RESULT_REJECTED',
    matchId: match._id.toString(),
    reason: match.mediator_reject_reason,
  });

  return match;
};

const selectWinner = async (matchId, mediatorId, winnerUserId) => {
  const match = await Match.findById(matchId);
  if (!match) throw new Error('Match not found');
  if (!match.mediator_user_id || match.mediator_user_id.toString() !== mediatorId.toString()) {
    throw new Error('Only assigned mediator can select winner');
  }
  if (match.status !== 'REVIEW' && match.status !== 'ONGOING') {
    throw new Error('Match not ready for winner selection');
  }
  const isParticipant = match.participants.some(
    p => p.user_id.toString() === winnerUserId.toString()
  );
  if (!isParticipant) throw new Error('Selected user is not a participant');

  match.winner_id = winnerUserId;
  match.status = 'REVIEW';
  match.ai_verdict = {
    winner_user_id: winnerUserId,
    confidence: 1.0,
    reasoning: 'Winner manually selected by mediator',
    generated_at: new Date(),
  };
  await match.save();

  broadcastToUser(match.created_by.toString(), {
    type: 'MATCH_RESULT_APPROVED',
    matchId: match._id.toString(),
    winner_id: winnerUserId,
  });

  return match;
};

module.exports = {
  submitResult,
  approveResult,
  checkMediatorStatus,
  getMediatorMatches,
  submitParticipantResult,
  analyzeResultsWithAI,
  rejectResult,
  selectWinner,
  SS_UPLOAD_DEADLINE_MIN,
  RESULT_DECLARATION_DEADLINE_MIN,
};
