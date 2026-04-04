const Redis = require('ioredis');
const { logger } = require('../utils/logger');

let redis;

function redisOptions() {
  const port = Number(process.env.REDIS_PORT);
  const pwd = process.env.REDIS_PASSWORD?.trim();
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number.isFinite(port) && port > 0 ? port : 6379,
    ...(pwd ? { password: pwd } : {}),
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  };
}

async function connectRedis() {
  try {
    redis = new Redis(redisOptions());

    redis.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redis.on('error', (error) => {
      logger.error('Redis connection error:', error);
    });

    redis.on('close', () => {
      logger.warn('Redis connection closed');
    });

    await redis.connect();
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
}

function getRedis() {
  if (!redis) {
    throw new Error('Redis not initialized. Call connectRedis() first.');
  }
  return redis;
}

async function disconnectRedis() {
  if (redis) {
    await redis.disconnect();
    logger.info('Redis disconnected');
  }
}

module.exports = {
  connectRedis,
  getRedis,
  disconnectRedis
};
