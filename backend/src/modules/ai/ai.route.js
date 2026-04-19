'use strict';

const express = require('express');
const AiController = require('./ai.controller');

const router = express.Router();

/**
 * @swagger
 * /ai/chat:
 *   post:
 *     summary: Gửi tin nhắn để AI xử lý và cập nhật giỏ hàng
 *     tags: [AI]
 *     description: |
 *       AI đóng vai "Cô chủ tiệm trà sữa" — phân tích tin nhắn tự nhiên,
 *       trích xuất tên món + số lượng + size, fuzzy match với menu,
 *       rồi tự động cập nhật giỏ hàng Redis.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [telegramUserId, message]
 *             properties:
 *               telegramUserId:
 *                 type: string
 *                 example: '123456789'
 *                 description: Telegram user ID để định danh giỏ hàng
 *               message:
 *                 type: string
 *                 example: 'cho mình 2 Trà Sữa Khoai Môn size M ít đá nhé'
 *                 description: Tin nhắn tự nhiên từ khách hàng
 *     responses:
 *       200:
 *         description: Xử lý thành công — trả về giỏ hàng đã cập nhật
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:  { type: string, example: success }
 *                 message: { type: string, example: 'Đã thêm 2 món vào giỏ hàng!' }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CartItem'
 *       400:
 *         description: Thiếu telegramUserId hoặc message
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Lỗi OpenAI hoặc lỗi hệ thống
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/chat', AiController.handleChat);

module.exports = router;