const { createClient } = require('redis');

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 3) {
        console.log('Redis: Max retries reached, stopping reconnection attempts');
        return false;
      }
      return Math.min(retries * 200, 2000);
    },
  },
});

redisClient.on('error', (err) => console.error('Redis Client Error:', err.message));
redisClient.on('connect', () => console.log('Redis connected'));

let redisConnected = false;

const connectRedis = async () => {
  if (!redisClient.isOpen) {
    try {
      await redisClient.connect();
      redisConnected = true;
    } catch (err) {
      console.error('Redis connection failed:', err.message);
      redisConnected = false;
    }
  }
  return redisClient;
};

const isRedisConnected = () => redisConnected;

module.exports = { redisClient, connectRedis, isRedisConnected };