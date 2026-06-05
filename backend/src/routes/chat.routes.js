const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const chatController = require('../controllers/chat.controller');

const router = express.Router();

router.use(protect);

router.get('/conversations', chatController.listConversations);
router.get('/conversations/:conversationId/messages', chatController.listMessages);
router.post('/conversations', chatController.openOrCreateWithFriend);
router.post('/messages', chatController.sendMessage);
router.get('/eligibility', chatController.getEligibility);
router.get('/unread', chatController.getUnreadCount);

module.exports = router;
