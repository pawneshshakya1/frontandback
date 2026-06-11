const AppVersionConfig = require('../models/appVersionConfig.model');
const STATUS_CODES = require('../utils/statusCodes');
const { compareVersions } = require('../utils/semver');
const cache = require('../utils/cache');

const VERSION_CACHE_TTL = 300;

const getVersionStatus = async (req, res) => {
  try {
    const { platform, appVersion } = req.query;

    if (!platform || !appVersion) {
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: 'platform and appVersion are required' });
    }

    const cacheKey = `appversion:status:${platform}:${appVersion}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const config = await AppVersionConfig.findOne({ platform: platform.toLowerCase() });
    if (!config) {
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ success: false, message: 'App version config not found' });
    }

    const isSupported =
      compareVersions(appVersion, config.minSupportedVersion) >= 0;

    let response;
    if (isSupported) {
      response = {
        status: 'OK',
        latestVersion: config.latestVersion,
        message: config.message,
      };
    } else {
      const graceDeadline = new Date(config.updatedAt);
      graceDeadline.setDate(graceDeadline.getDate() + config.graceDays);
      const graceActive = Date.now() <= graceDeadline.getTime();

      if (!config.forceUpdate && graceActive) {
        response = {
          status: 'WARNING',
          latestVersion: config.latestVersion,
          minSupportedVersion: config.minSupportedVersion,
          graceDays: config.graceDays,
          message: config.message,
          storeUrl: config.storeUrl,
        };
      } else {
        response = {
          status: 'FORCE_UPDATE',
          latestVersion: config.latestVersion,
          minSupportedVersion: config.minSupportedVersion,
          message: config.message,
          storeUrl: config.storeUrl,
        };
      }
    }

    await cache.set(cacheKey, response, VERSION_CACHE_TTL);
    return res.json(response);
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

    await cache.del(`appversion:config:${platform.toLowerCase()}`);
    await cache.del('appversion:config:all');
    await cache.delPattern(`appversion:status:${platform.toLowerCase()}:*`);

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
    const cacheKey = platform
      ? `appversion:config:${platform.toLowerCase()}`
      : 'appversion:config:all';

    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    let result;
    if (!platform) {
      const configs = await AppVersionConfig.find({}).sort({ platform: 1 });

      result = {};
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

      const androidConfig = configs.find(c => c.platform === 'android');
      const iosConfig = configs.find(c => c.platform === 'ios');

      result = {
        android_version: androidConfig?.latestVersion || '',
        ios_version: iosConfig?.latestVersion || '',
        min_android_version: androidConfig?.minSupportedVersion || '',
        platform_fee: 1,
        min_withdrawal: 100,
        joining_bonus: 0,
        referral_bonus: 0,
        platforms: result,
      };
    } else {
      const config = await AppVersionConfig.findOne({
        platform: platform.toLowerCase(),
      });

      if (!config) {
        return res
          .status(STATUS_CODES.NOT_FOUND)
          .json({ success: false, message: 'App version config not found' });
      }

      result = config;
    }

    await cache.set(cacheKey, result, VERSION_CACHE_TTL);
    return res.json({ success: true, data: result });
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
