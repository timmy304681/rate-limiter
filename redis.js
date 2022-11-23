const redis = require('redis');

// get info from .env
require('dotenv').config();
const { REDIS_USER, REDIS_PASSWORD, REDIS_SERVER, REDIS_PORT } = process.env;

// redis setting
const redisClient = redis.createClient({
  url: `redis://${REDIS_USER}:${REDIS_PASSWORD}@${REDIS_SERVER}:${REDIS_PORT}`,
});
redisClient.connect();

redisClient.ready = false;

redisClient.on('ready', () => {
  redisClient.ready = true;
  console.log('Redis is ready');
});

redisClient.on('error', () => {
  redisClient.ready = false;
});

redisClient.on('end', () => {
  redisClient.ready = false;
  console.log('Redis is disconnected');
});

module.exports = redisClient;
