const AppVersionConfig = require('../models/appVersionConfig.model');
const STATUS_CODES = require('../utils/statusCodes');
const { compareVersions } = require('../utils/semver');

const getVersionStatus = async (req, res) => {
  try {
    const { platform, appVersion } = req.query;

    if (!platform || !appVersion) {
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: 'platform and appVersion are required' });
    }

    const config = await AppVersionConfig.findOne({ platform: platform.toLowerCase() });
    if (!config) {
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ success: false, message: 'App version config not found' });
    }

    const isSupported =
      compareVersions(appVersion, config.minSupportedVersion) >= 0;

    if (isSupported) {
      return res.json({
        status: 'OK',
        latestVersion: config.latestVersion,
        message: config.message,
      });
    }

    // Use the last config update time as the start of the grace window.
    const graceDeadline = new Date(config.updatedAt);
    graceDeadline.setDate(graceDeadline.getDate() + config.graceDays);
    const graceActive = Date.now() <= graceDeadline.getTime();

    if (!config.forceUpdate && graceActive) {
      return res.json({
        status: 'WARNING',
        latestVersion: config.latestVersion,
        minSupportedVersion: config.minSupportedVersion,
        graceDays: config.graceDays,
        message: config.message,
        storeUrl: config.storeUrl,
      });
    }

    return res.json({
      status: 'FORCE_UPDATE',
      latestVersion: config.latestVersion,
      minSupportedVersion: config.minSupportedVersion,
      message: config.message,
      storeUrl: config.storeUrl,
    });
  } catch (error) {
    return res
      .status(STATUS_CODES.SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

const upsertVersionConfig = async (req, res) => {
  try {
    const {
      platform,
      latestVersion,
      minSupportedVersion,
      graceDays,
      forceUpdate,
      message,
      storeUrl,
    } = req.body;

    if (!platform || !latestVersion || !minSupportedVersion) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: 'platform, latestVersion, and minSupportedVersion are required',
      });
    }

    const updatedConfig = await AppVersionConfig.findOneAndUpdate(
      { platform: platform.toLowerCase() },
      {
        platform: platform.toLowerCase(),
        latestVersion,
        minSupportedVersion,
        graceDays,
        forceUpdate,
        message,
        storeUrl,
      },
      { new: true, upsert: true, runValidators: true },
    );

    return res.json({ success: true, data: updatedConfig });
  } catch (error) {
    return res
      .status(STATUS_CODES.BAD_REQUEST)
      .json({ success: false, message: error.message });
  }
};

const getVersionConfig = async (req, res) => {
  try {
    const { platform } = req.query;

    // If no platform specified, return all configs (for admin settings screen)
    if (!platform) {
      const configs = await AppVersionConfig.find({}).sort({ platform: 1 });
      
      // Format as object with platform keys for frontend
      const result = {};
      configs.forEach(c => {
        result[c.platform] = {
          latestVersion: c.latestVersion,
          minSupportedVersion: c.minSupportedVersion,
          graceDays: c.graceDays,
          forceUpdate: c.forceUpdate,
          message: c.message,
          storeUrl: c.storeUrl,
          updatedAt: c.updatedAt,
        };
      });

      // Also add flat fields for admin screen compatibility
      const androidConfig = configs.find(c => c.platform === 'android');
      const iosConfig = configs.find(c => c.platform === 'ios');

      return res.json({
        success: true,
        data: {
          android_version: androidConfig?.latestVersion || '',
          ios_version: iosConfig?.latestVersion || '',
          min_android_version: androidConfig?.minSupportedVersion || '',
          platform_fee: 1,
          min_withdrawal: 100,
          joining_bonus: 0,
          referral_bonus: 0,
          platforms: result,
        },
      });
    }

    // Platform specified - return single config
    const config = await AppVersionConfig.findOne({
      platform: platform.toLowerCase(),
    });

    if (!config) {
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ success: false, message: 'App version config not found' });
    }

    return res.json({ success: true, data: config });
  } catch (error) {
    return res
      .status(STATUS_CODES.SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

module.exports = {
  getVersionStatus,
  upsertVersionConfig,
  getVersionConfig,
};
