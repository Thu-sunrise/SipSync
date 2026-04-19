'use strict';

const express = require('express');

const router = express.Router();

/**
 * @swagger
 * /metrics:
 *   get:
 *     summary: Prometheus metrics endpoint
 *     tags: [Health]
 *     description: Scrape bởi Grafana Cloud Agent. Format text/plain theo chuẩn Prometheus.
 *     responses:
 *       200:
 *         description: Prometheus exposition format
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "# HELP orders_total Tổng số đơn hàng\n# TYPE orders_total counter\n"
 */
router.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send('# metrics endpoint — coming soon\n');
});

module.exports = router;