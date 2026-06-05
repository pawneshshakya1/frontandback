const mongoose = require('mongoose');
const User = require('../models/user.model');
const UserProfile = require('../models/user-profile.model');
const Wallet = require('../models/wallet.model');
const Match = require('../models/match.model');
const Friend = require('../models/friend.model');
const Transaction = require('../models/transaction.model');
const STATUS_CODES = require('../utils/statusCodes');

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password_hash');
    if (!user) {
      return res.sendError(new Error('User not found'), 'User not found', STATUS_CODES.NOT_FOUND);
    }

    let profile = await UserProfile.findOne({ user_id: req.userId });
    if (!profile) {
      profile = await UserProfile.create({ user_id: req.userId });
    }

    res.sendSuccess({ user, profile }, 'Profile retrieved', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.SERVER_ERROR);
  }
};

const updateProfile = async (req, res) => {
  try {
    const { user: userData, profile: profileData } = req.body;

    if (userData) {
      const allowedUserFields = ['username'];
      const filteredUserData = {};
      for (const key of allowedUserFields) {
        if (userData[key] !== undefined) {
          filteredUserData[key] = userData[key];
        }
      }
      if (Object.keys(filteredUserData).length > 0) {
        await User.findByIdAndUpdate(req.userId, filteredUserData);
      }
    }

    if (profileData) {
      const allowedProfileFields = [
        'full_name', 'phone', 'game_uid_name', 'gender', 'ff_max_uid',
        'guild_uid', 'guild_name', 'preferred_role', 'discord_tag', 'bio',
        'avatar', 'background_image', 'instagram', 'facebook', 'x_twitter',
        'threads', 'youtube', 'discord_server', 'ads_disabled', 'payment_preference',
      ];
      const filteredProfileData = {};
      for (const key of allowedProfileFields) {
        if (profileData[key] !== undefined) {
          filteredProfileData[key] = profileData[key];
        }
      }

      let profile = await UserProfile.findOne({ user_id: req.userId });
      if (!profile) {
        profile = await UserProfile.create({ user_id: req.userId, ...filteredProfileData });
      } else {
        profile = await UserProfile.findOneAndUpdate(
          { user_id: req.userId },
          filteredProfileData,
          { new: true }
        );
      }
    }

    const user = await User.findById(req.userId).select('-password_hash');
    const profile = await UserProfile.findOne({ user_id: req.userId });

    res.sendSuccess({ user, profile }, 'Profile updated', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const getPublicProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('username email role is_verified created_at');
    if (!user) {
      return res.sendError(new Error('User not found'), 'User not found', STATUS_CODES.NOT_FOUND);
    }

    const profile = await UserProfile.findOne({ user_id: id }).select('-user_id');

    res.sendSuccess({ user, profile }, 'Public profile retrieved', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const getStats = async (req, res) => {
  try {
    const matches = await Match.find({
      participants: { $elemMatch: { user_id: new mongoose.Types.ObjectId(req.userId) } },
    });

    const totalMatches = matches.length;
    const completedMatches = matches.filter(m => m.status === 'COMPLETED').length;
    const ongoingMatches = matches.filter(m => m.status === 'ONGOING').length;
    const openMatches = matches.filter(m => m.status === 'OPEN').length;

    const friendsCount = await Friend.countDocuments({
      $or: [
        { user_id: new mongoose.Types.ObjectId(req.userId), status: 'ACCEPTED' },
        { friend_id: new mongoose.Types.ObjectId(req.userId), status: 'ACCEPTED' },
      ],
    });

    const wallet = await Wallet.findOne({ user_id: new mongoose.Types.ObjectId(req.userId) });

    res.sendSuccess({
      totalMatches,
      completedMatches,
      ongoingMatches,
      openMatches,
      friendsCount,
      walletBalance: wallet ? Number(wallet.available_balance) || 0 : 0,
    }, 'Stats retrieved', STATUS_CODES.OK);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.SERVER_ERROR);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getPublicProfile,
  getStats,
};
