'use strict';

const { getDBStatus } = require('../shared/db');
const { getRedisClient } = require('../shared/redis');

async function healthCheck(req, res) {
  const components = {
    mongodb: getDBStatus(),
    redis: 'error',
    menu_catalog: 'ok',
  };

  try {
    const redis = getRedisClient();
    const pong = await redis.ping();
    components.redis = pong === 'PONG' ? 'ok' : 'error';
  } catch {
    components.redis = 'error';
  }

  const allOk = Object.values(components).every((s) => s === 'ok');

  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degraded',
    components,
  });
}

module.exports = { healthCheck };