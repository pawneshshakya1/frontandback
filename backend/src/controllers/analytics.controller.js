const spendAnalyticsService = require('../services/user-spend-analytics.service');
const STATUS_CODES = require('../utils/statusCodes');

const getMyAnalytics = async (req, res) => {
  try {
    const analytics = await spendAnalyticsService.getUserAnalytics(req.userId);
    res.sendSuccess(analytics, 'Analytics retrieved', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const getAdminUserFinancialProfile = async (req, res) => {
  try {
    const profile = await spendAnalyticsService.getAdminUserFinancialProfile(req.params.userId);
    res.sendSuccess(profile, 'User financial profile retrieved', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const getAdminAllUsersSpending = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const users = await spendAnalyticsService.getAdminAllUsersSpending({ skip, limit });
    res.sendSuccess({ users, page, limit }, 'Users spending retrieved', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const getSystemRevenue = async (req, res) => {
  try {
    const report = await spendAnalyticsService.getSystemRevenueReport();
    res.sendSuccess(report, 'System revenue report', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

module.exports = {
  getMyAnalytics,
  getAdminUserFinancialProfile,
  getAdminAllUsersSpending,
  getSystemRevenue,
};
