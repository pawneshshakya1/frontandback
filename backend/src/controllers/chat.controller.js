const chatService = require('../services/chat.service');
const STATUS_CODES = require('../utils/statusCodes');

const listConversations = async (req, res) => {
  try {
    const list = await chatService.listConversations(req.userId);
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const listMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = await chatService.listMessages(req.userId, conversationId);
    res.json({ success: true, data: messages });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { receiver_id, content } = req.body;
    const message = await chatService.sendMessage(req.userId, receiver_id, content);
    res.json({ success: true, data: message });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const openOrCreateWithFriend = async (req, res) => {
  try {
    const { friend_id } = req.body;
    const conv = await chatService.getOrCreateWithFriend(req.userId, friend_id);
    res.json({ success: true, data: conv });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const getEligibility = async (req, res) => {
  try {
    const eligible = await chatService.isChatEligible(req.userId);
    res.json({ success: true, data: { eligible } });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const count = await chatService.getUnreadCount(req.userId);
    res.json({ success: true, data: { count } });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

module.exports = {
  listConversations,
  listMessages,
  sendMessage,
  openOrCreateWithFriend,
  getEligibility,
  getUnreadCount,
};
