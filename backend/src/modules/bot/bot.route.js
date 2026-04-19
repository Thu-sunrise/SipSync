'use strict';

const express = require('express');
const BotController = require('./bot.controller');

const router = express.Router();

/**
 * @swagger
 * /webhook/telegram:
 *   post:
 *     summary: Nhận webhook từ Telegram Bot
 *     tags: [Webhook]
 *     responses:
 *       200:
 *         description: OK
 */
router.post('/telegram', BotController.handleWebhook);

module.exports = router;
