const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { protect } = require('../middlewares/auth.middleware');
const { validateObjectId } = require('../middlewares/security.middleware');

// All user routes require authentication
router.use(protect);

router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.get('/profile/:id', validateObjectId('id'), userController.getPublicProfile);
router.get('/stats', userController.getStats);

module.exports = router;
