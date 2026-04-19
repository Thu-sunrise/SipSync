'use strict';

const express = require('express');
const { healthCheck } = require('../controllers/health.controller');

const router = express.Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Kiểm tra trạng thái hệ thống
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Tất cả component hoạt động bình thường
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 components:
 *                   type: object
 *                   properties:
 *                     mongodb:      { type: string, example: ok }
 *                     redis:        { type: string, example: ok }
 *                     menu_catalog: { type: string, example: ok }
 *       503:
 *         description: Ít nhất một component bị lỗi
 */
router.get('/health', healthCheck);

module.exports = router;