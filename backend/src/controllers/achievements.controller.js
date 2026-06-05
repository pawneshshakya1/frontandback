const Achievement = require('../models/achievement.model');
const UserAchievement = require('../models/user-achievement.model');
const STATUS_CODES = require('../utils/statusCodes');

const listAchievements = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const category = req.query.category;
    const tier = req.query.tier;

    const filter = { is_active: true };
    if (category) filter.category = category;
    if (tier) filter.tier = tier;

    const [items, total] = await Promise.all([
      Achievement.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Achievement.countDocuments(filter),
    ]);

    res.sendSuccess({
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    }, 'Achievements retrieved', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const listMyAchievements = async (req, res) => {
  try {
    const userId = req.userId;
    const userAchievements = await UserAchievement.find({ user_id: userId })
      .populate('achievement_id')
      .sort({ updatedAt: -1 })
      .lean();

    const items = userAchievements
      .filter((ua) => ua.achievement_id)
      .map((ua) => ({
        ...ua.achievement_id,
        user_progress: {
          status: ua.status,
          progress: ua.progress,
          achieved_at: ua.achieved_at,
          claimed_at: ua.claimed_at,
          reward_credited: ua.reward_credited,
        },
      }));

    res.sendSuccess({ items, total: items.length }, 'User achievements retrieved', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const getAchievement = async (req, res) => {
  try {
    const achievement = await Achievement.findById(req.params.id).lean();
    if (!achievement) {
      return res.sendError(new Error('Achievement not found'), 'Achievement not found', STATUS_CODES.NOT_FOUND);
    }
    res.sendSuccess(achievement, 'Achievement retrieved', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const createAchievement = async (req, res) => {
  try {
    const { title, description, category, tier, points, icon, color, target_value, criteria, reward_amount } = req.body;
    if (!title || !description) {
      return res.sendError(new Error('Title and description are required'), 'Title and description are required', STATUS_CODES.BAD_REQUEST);
    }

    const achievement = await Achievement.create({
      title,
      description,
      category: category || 'SPECIAL',
      tier: tier || 'BRONZE',
      points: points || 0,
      icon: icon || 'emoji-events',
      color: color || '#fbbf24',
      target_value: target_value || 1,
      criteria: criteria || '',
      reward_amount: reward_amount || 0,
      is_active: true,
      created_by: req.userId,
    });

    res.sendSuccess(achievement, 'Achievement created', STATUS_CODES.CREATED);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const updateAchievement = async (req, res) => {
  try {
    const allowedFields = ['title', 'description', 'category', 'tier', 'points', 'icon', 'color', 'target_value', 'criteria', 'reward_amount', 'is_active'];
    const updates = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const achievement = await Achievement.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!achievement) {
      return res.sendError(new Error('Achievement not found'), 'Achievement not found', STATUS_CODES.NOT_FOUND);
    }
    res.sendSuccess(achievement, 'Achievement updated', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const deleteAchievement = async (req, res) => {
  try {
    const achievement = await Achievement.findByIdAndDelete(req.params.id);
    if (!achievement) {
      return res.sendError(new Error('Achievement not found'), 'Achievement not found', STATUS_CODES.NOT_FOUND);
    }
    await UserAchievement.deleteMany({ achievement_id: req.params.id });
    res.sendSuccess({ id: req.params.id }, 'Achievement deleted', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

module.exports = {
  listAchievements,
  listMyAchievements,
  getAchievement,
  createAchievement,
  updateAchievement,
  deleteAchievement,
};
