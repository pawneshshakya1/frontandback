// Barrel module — re-exports the four split admin controllers so
// existing route / test imports of
// `require('../controllers/admin.controller')` keep working.
//
// Split layout (Q-refactor):
//   admin.dashboard.controller.js — getStats, getWeeklyPerformance,
//                                  getMediatorDashboard, and shared
//                                  wallet-formatting helpers
//   admin.user.controller.js      — list / inspect / edit / block /
//                                  delete users, mediator apps,
//                                  user financial profile, security
//                                  audits
//   admin.match.controller.js     — list / inspect / edit / publish
//                                  / room-details / bulk-action /
//                                  per-match analytics, plus the
//                                  three admin event creators
//   admin.finance.controller.js   — wallets, transactions
//   admin.banner.controller.js    — banner CRUD
//
// New code should import from the specific sub-controller.

const dashboard = require('./admin.dashboard.controller');
const user = require('./admin.user.controller');
const match = require('./admin.match.controller');
const finance = require('./admin.finance.controller');
const banner = require('./admin.banner.controller');

module.exports = {
  // dashboard
  getStats: dashboard.getStats,
  getWeeklyPerformance: dashboard.getWeeklyPerformance,
  getMediatorDashboard: dashboard.getMediatorDashboard,
  // user
  getUsers: user.getUsers,
  getUserById: user.getUserById,
  updateUser: user.updateUser,
  deleteUser: user.deleteUser,
  blockUnblockUser: user.blockUnblockUser,
  getMediatorApplications: user.getMediatorApplications,
  approveMediatorApplication: user.approveMediatorApplication,
  rejectMediatorApplication: user.rejectMediatorApplication,
  getUserFinancialProfile: user.getUserFinancialProfile,
  getSecurityAudits: user.getSecurityAudits,
  // match
  getMatches: match.getMatches,
  getMatchById: match.getMatchById,
  updateMatch: match.updateMatch,
  deleteMatch: match.deleteMatch,
  updateMatchStatus: match.updateMatchStatus,
  togglePublish: match.togglePublish,
  addRoomDetails: match.addRoomDetails,
  updateRoomDetails: match.updateRoomDetails,
  bulkAction: match.bulkAction,
  getMatchAnalytics: match.getMatchAnalytics,
  createSponsoredEvent: match.createSponsoredEvent,
  createPremiumEvent: match.createPremiumEvent,
  createStandardEvent: match.createStandardEvent,
  // finance
  getWallets: finance.getWallets,
  getWalletById: finance.getWalletById,
  adjustWalletBalance: finance.adjustWalletBalance,
  getTransactions: finance.getTransactions,
  getTransactionById: finance.getTransactionById,
  // banner
  getBanners: banner.getBanners,
  createBanner: banner.createBanner,
  updateBanner: banner.updateBanner,
  deleteBanner: banner.deleteBanner,
};
