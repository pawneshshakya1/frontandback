const AppVersionConfig = require("../models/appVersionConfig.model");
const { compareVersions } = require("../utils/semver");

// In-memory cache to avoid hitting Mongo on every request
let cache = { ts: 0, data: new Map() };
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const getCachedConfig = async (platform) => {
  const now = Date.now();
  if (now - cache.ts > CACHE_TTL_MS) {
    cache = { ts: now, data: new Map() };
    const configs = await AppVersionConfig.find({});
    for (const cfg of configs) {
      cache.data.set(String(cfg.platform).toLowerCase(), cfg);
    }
  }
  return cache.data.get(String(platform).toLowerCase()) || null;
};

const enforceMinAppVersion = async (req, res, next) => {
  try {
    const appVersion = req.headers["app-version"];
    const platform = req.headers["platform"];

    if (!appVersion || !platform) {
      return next();
    }

    const config = await getCachedConfig(platform);
    if (!config) {
      return next();
    }

    const isSupported =
      compareVersions(appVersion, config.minSupportedVersion) >= 0;

    const graceDeadline = new Date(config.updatedAt);
    graceDeadline.setDate(graceDeadline.getDate() + config.graceDays);
    const graceActive = Date.now() <= graceDeadline.getTime();

    if (!isSupported && (config.forceUpdate || !graceActive)) {
      return res.status(426).json({
        message: "Please update the app to continue",
      });
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = { enforceMinAppVersion, invalidateAppVersionCache: () => { cache = { ts: 0, data: new Map() }; } };
