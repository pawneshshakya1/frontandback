const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friend.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');
const { validateObjectId } = require('../middlewares/security.middleware');

router.use(protect);
router.use(restrictTo('USER', 'PARTNER', 'ADMIN', 'MEDIATOR'));

router.post('/request', friendController.sendRequest);
router.put('/request/:id/accept', validateObjectId('id'), friendController.acceptRequest);
router.delete('/request/:id/reject', validateObjectId('id'), friendController.rejectRequest);
router.delete('/:id', validateObjectId('id'), friendController.removeFriend);
router.post('/block/:id', validateObjectId('id'), friendController.blockUser);
router.post('/unblock/:id', validateObjectId('id'), friendController.unblockUser);
router.get('/', friendController.getFriends);
router.get('/pending', friendController.getPendingRequests);
router.get('/sent', friendController.getSentRequests);
router.get('/blocked', friendController.getBlockedUsers);
router.get('/search', friendController.searchUsers);

module.exports = router;
