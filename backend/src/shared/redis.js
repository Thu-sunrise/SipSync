'use strict';

const Redis = require('ioredis');
const logger = require('./logger');

let client = null;

/**
 * Khởi tạo singleton ioredis client kết nối Upstash Redis.
 * Upstash dùng rediss:// (TLS) nên cần truyền tls: {} vào options.
 */
function getRedisClient() {
  if (client) {
    logger.info('Redis: đã kết nối, reuse connection');
    return client;
}
  
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('REDIS_URL is not defined in environment variables');
  }

  // Upstash có thể dùng rediss:// hoặc redis:// với TLS bật riêng.
  // Nếu URL là redis:// nhưng host là *.upstash.io → vẫn cần TLS.
  const isTLS =
    redisUrl.startsWith('rediss://') ||
    redisUrl.includes('.upstash.io');

  client = new Redis(redisUrl, {
    tls: isTLS ? {} : undefined,
    // Tắt auto-reconnect vô hạn — sau 3 lần thất bại thì dừng
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) {
        logger.error('Redis: quá số lần retry, dừng kết nối lại');
        return null; // dừng retry
      }
      const delay = Math.min(times * 200, 2000);
      logger.warn(`Redis: retry lần ${times}, thử lại sau ${delay}ms`);
      return delay;
    },
    lazyConnect: false,
  });
  
  client.on('connect', () => {
    logger.info('Redis: kết nối thành công');
  });

  client.on('ready', () => {
    logger.info('Redis: sẵn sàng nhận lệnh');
  });

  client.on('error', (err) => {
    logger.error({ err }, 'Redis: lỗi kết nối');
  });

  client.on('close', () => {
    logger.warn('Redis: kết nối đã đóng');
  });

  client.on('reconnecting', (delay) => {
    logger.warn(`Redis: đang kết nối lại sau ${delay}ms`);
  });

  return client;
}

/**
 * Đóng kết nối Redis (dùng khi shutdown gracefully).
 */
async function closeRedis() {
  if (client) {
    await client.quit();
    client = null;
    logger.info('Redis: đã đóng kết nối');
  }
}

module.exports = { getRedisClient, closeRedis };
