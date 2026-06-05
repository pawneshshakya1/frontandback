const friendService = require('../services/friend.service');
const STATUS_CODES = require('../utils/statusCodes');

const sendRequest = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.sendError(new Error('Email is required'), 'Email is required', STATUS_CODES.BAD_REQUEST);
    }
    const result = await friendService.sendFriendRequest(req.userId, email);
    res.sendSuccess(result, result.message, STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const acceptRequest = async (req, res) => {
  try {
    const result = await friendService.acceptFriendRequest(req.userId, req.params.id);
    res.sendSuccess(result, result.message, STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const rejectRequest = async (req, res) => {
  try {
    const result = await friendService.rejectFriendRequest(req.userId, req.params.id);
    res.sendSuccess(result, result.message, STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const removeFriend = async (req, res) => {
  try {
    const result = await friendService.removeFriend(req.userId, req.params.id);
    res.sendSuccess(result, result.message, STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const blockUser = async (req, res) => {
  try {
    const result = await friendService.blockUser(req.userId, req.params.id);
    res.sendSuccess(result, result.message, STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const unblockUser = async (req, res) => {
  try {
    const result = await friendService.unblockUser(req.userId, req.params.id);
    res.sendSuccess(result, result.message, STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const getFriends = async (req, res) => {
  try {
    const friends = await friendService.getFriends(req.userId);
    res.sendSuccess(friends, 'Friends list', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const getPendingRequests = async (req, res) => {
  try {
    const requests = await friendService.getPendingRequests(req.userId);
    res.sendSuccess(requests, 'Pending requests', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const getSentRequests = async (req, res) => {
  try {
    const requests = await friendService.getSentRequests(req.userId);
    res.sendSuccess(requests, 'Sent requests', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const getBlockedUsers = async (req, res) => {
  try {
    const blocked = await friendService.getBlockedUsers(req.userId);
    res.sendSuccess(blocked, 'Blocked users', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const searchUsers = async (req, res) => {
  try {
    const { q, limit } = req.query;
    const results = await friendService.searchUsers(req.userId, q, parseInt(limit) || 20);
    res.sendSuccess(results, 'Search results', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

module.exports = {
  sendRequest,
  acceptRequest,
  rejectRequest,
  removeFriend,
  blockUser,
  unblockUser,
  getFriends,
  getPendingRequests,
  getSentRequests,
  getBlockedUsers,
  searchUsers,
};
