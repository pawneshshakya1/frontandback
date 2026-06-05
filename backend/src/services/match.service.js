// Barrel module — re-exports the four split match services so
// existing controller / route / other-service imports of
// `require('./match.service')` keep working without churn.
//
// Split layout (Q-refactor):
//   match-lifecycle.service.js  — create / update / delete / cancel,
//                                 draft / publish, share / invite,
//                                 public + private read paths
//   match-payment.service.js    — join / leave / cashfree / wallet
//   match-result.service.js     — submit / approve / reject /
//                                 AI-analyse / select-winner
//   match-credentials.service.js — room-id / room-password
//                                  masking + setRoomCredentials
//
// New code should import from the specific sub-service where
// possible. The barrel exists for back-compat.

const lifecycle = require('./match-lifecycle.service');
const payment = require('./match-payment.service');
const result = require('./match-result.service');
const credentials = require('./match-credentials.service');
const matchTime = require('../utils/match-time.util');

module.exports = {
  // lifecycle
  checkMatchStatus: lifecycle.checkMatchStatus,
  getMatch: lifecycle.getMatch,
  getAllMatches: lifecycle.getAllMatches,
  getJoinedMatches: lifecycle.getJoinedMatches,
  getCreatedMatches: lifecycle.getCreatedMatches,
  createMatch: lifecycle.createMatch,
  updateMatch: lifecycle.updateMatch,
  deleteMatch: lifecycle.deleteMatch,
  cancelMatch: lifecycle.cancelMatch,
  shareMatch: lifecycle.shareMatch,
  joinByInviteCode: lifecycle.joinByInviteCode,
  getMatchByShareToken: lifecycle.getMatchByShareToken,
  getDrafts: lifecycle.getDrafts,
  getInvites: lifecycle.getInvites,
  publishDraft: lifecycle.publishDraft,
  generateShareToken: lifecycle.generateShareToken,
  generateInviteCode: lifecycle.generateInviteCode,
  getEffectivePassType: lifecycle.getEffectivePassType,
  getDailyEventCount: lifecycle.getDailyEventCount,
  DAILY_EVENT_LIMITS: lifecycle.DAILY_EVENT_LIMITS,

  // payment
  joinMatch: payment.joinMatch,
  joinMatchById: payment.joinMatchById,
  leaveMatch: payment.leaveMatch,
  initiateMatchPayment: payment.initiateMatchPayment,
  confirmCashfreeJoin: payment.confirmCashfreeJoin,

  // result
  submitResult: result.submitResult,
  approveResult: result.approveResult,
  checkMediatorStatus: result.checkMediatorStatus,
  getMediatorMatches: result.getMediatorMatches,
  submitParticipantResult: result.submitParticipantResult,
  analyzeResultsWithAI: result.analyzeResultsWithAI,
  rejectResult: result.rejectResult,
  selectWinner: result.selectWinner,
  SS_UPLOAD_DEADLINE_MIN: result.SS_UPLOAD_DEADLINE_MIN,
  RESULT_DECLARATION_DEADLINE_MIN: result.RESULT_DECLARATION_DEADLINE_MIN,

  // credentials
  setRoomCredentials: credentials.setRoomCredentials,
  maskCredentialsForViewer: credentials.maskCredentialsForViewer,
  CREDENTIALS_REVEAL_BEFORE_MIN: matchTime.CREDENTIALS_REVEAL_BEFORE_MIN,
  CREDENTIALS_EDIT_BEFORE_MIN: matchTime.CREDENTIALS_EDIT_BEFORE_MIN,
  CREDENTIALS_EDIT_AFTER_MIN: matchTime.CREDENTIALS_EDIT_AFTER_MIN,
  getMatchStartDateTime: matchTime.getMatchStartDateTime,
  getCredentialsRevealTime: matchTime.getCredentialsRevealTime,
  getCredentialsEditCutoff: matchTime.getCredentialsEditCutoff,
  canHostEditCredentials: matchTime.canHostEditCredentials,
};
