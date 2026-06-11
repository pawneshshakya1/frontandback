const { redisClient, isRedisConnected } = require('../config/redis');

const DEFAULT_TTL = 300;

const cache = {
  async get(key) {
    if (!isRedisConnected()) return null;
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.error('Cache get error:', err.message);
      return null;
    }
  },

  async set(key, value, ttl = DEFAULT_TTL) {
    if (!isRedisConnected()) return false;
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error('Cache set error:', err.message);
      return false;
    }
  },

  async del(key) {
    if (!isRedisConnected()) return false;
    try {
      await redisClient.del(key);
      return true;
    } catch (err) {
      console.error('Cache del error:', err.message);
      return false;
    }
  },

  async delPattern(pattern) {
    if (!isRedisConnected()) return false;
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      return true;
    } catch (err) {
      console.error('Cache delPattern error:', err.message);
      return false;
    }
  },
};

module.exports = cache;