'use strict';

const express = require('express');
const PaymentController = require('./payment.controller');

const router = express.Router();

/**
 * @swagger
 * /webhook/payos:
 *   post:
 *     summary: Nhận webhook thanh toán từ payOS
 *     tags: [Payment]
 *     description: |
 *       Endpoint này được payOS gọi khi có giao dịch ngân hàng.
 *       Xác thực HMAC-SHA256 qua header `x-payos-signature`.
 *       Trả về 200 ngay lập tức, xử lý bất đồng bộ sau.
 *     parameters:
 *       - in: header
 *         name: x-payos-signature
 *         required: true
 *         schema: { type: string }
 *         description: HMAC-SHA256 signature từ payOS
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:    { type: string, example: '00' }
 *               desc:    { type: string, example: 'success' }
 *               success: { type: boolean, example: true }
 *               data:
 *                 type: object
 *                 properties:
 *                   orderCode:   { type: integer, example: 1234567 }
 *                   amount:      { type: integer, example: 64000 }
 *                   description: { type: string }
 *                   reference:   { type: string, description: 'Dùng làm webhookEventId (idempotency key)' }
 *     responses:
 *       200:
 *         description: Đã nhận — xử lý bất đồng bộ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *       400:
 *         description: Chữ ký HMAC không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Dùng middleware json mặc định của app
router.post(
    '/payos',
    PaymentController.handleWebhook
);

module.exports = router;
