const express = require('express');
const router = express.Router();
const achievementsController = require('../controllers/achievements.controller');
const { protect } = require('../middlewares/auth.middleware');
const { isAdmin } = require('../middlewares/admin.middleware');

router.get('/', protect, achievementsController.listAchievements);
router.get('/my', protect, achievementsController.listMyAchievements);
router.get('/:id', protect, achievementsController.getAchievement);

router.post('/', protect, isAdmin, achievementsController.createAchievement);
router.put('/:id', protect, isAdmin, achievementsController.updateAchievement);
router.delete('/:id', protect, isAdmin, achievementsController.deleteAchievement);

module.exports = router;
