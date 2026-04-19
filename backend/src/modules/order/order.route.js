const express = require('express');
const OrderController = require('./order.controller');
const authMiddleware = require('../auth/auth.middleware');

const router = express.Router();

/**
 * @swagger
 * /order:
 *   post:
 *     summary: Tạo đơn hàng từ giỏ hàng hiện tại
 *     tags: [Order]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [telegramUserId, customerName]
 *             properties:
 *               telegramUserId: { type: string, example: '123456789' }
 *               customerName:   { type: string, example: 'Nguyễn Văn A' }
 *     responses:
 *       201:
 *         description: Tạo đơn thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:   { $ref: '#/components/schemas/Order' }
 *       400:
 *         description: Giỏ hàng trống hoặc thiếu thông tin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', OrderController.create);

/**
 * @swagger
 * /order:
 *   get:
 *     summary: Lấy danh sách đơn hàng đang active
 *     tags: [Order]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING_PAYMENT, QUEUED, IN_PROGRESS, COMPLETED, CANCELLED]
 *         description: Lọc theo trạng thái
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Danh sách đơn hàng
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 *                 total: { type: integer, example: 12 }
 */
router.get('/', authMiddleware, OrderController.getAll);

/**
 * @swagger
 * /order/{id}:
 *   get:
 *     summary: Lấy chi tiết một đơn hàng
 *     tags: [Order]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         example: 665f1a2b3c4d5e6f7a8b9c0d
 *     responses:
 *       200:
 *         description: Chi tiết đơn hàng
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:   { $ref: '#/components/schemas/Order' }
 *       404:
 *         description: Không tìm thấy đơn hàng
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', authMiddleware, OrderController.getOne);

/**
 * @swagger
 * /order/{id}/status:
 *   patch:
 *     summary: Cập nhật trạng thái đơn hàng (dành cho Admin Dashboard)
 *     tags: [Order]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         example: 665f1a2b3c4d5e6f7a8b9c0d
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [QUEUED, IN_PROGRESS, COMPLETED, CANCELLED]
 *                 example: IN_PROGRESS
 *               changedBy:
 *                 type: string
 *                 example: admin
 *     responses:
 *       200:
 *         description: Cập nhật thành công, broadcast WebSocket đến Dashboard
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:         { type: string, example: success }
 *                 previousStatus: { type: string, example: 'QUEUED' }
 *                 newStatus:      { type: string, example: 'IN_PROGRESS' }
 *       400:
 *         description: Trạng thái không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/:id/status', authMiddleware, OrderController.updateStatus);

/**
 * @swagger
 * /order/checkout:
 *   post:
 *     summary: Xác nhận đơn và tạo mã VietQR thanh toán
 *     tags: [Order]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [telegramUserId, customerName]
 *             properties:
 *               telegramUserId: { type: string, example: '123456789' }
 *               customerName:   { type: string, example: 'Nguyễn Văn A' }
 *     responses:
 *       200:
 *         description: Tạo VietQR thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:  { type: string, example: success }
 *                 orderId: { type: string, example: 665f1a2b3c4d5e6f7a8b9c0d }
 *                 payment:
 *                   type: object
 *                   properties:
 *                     qrCodeUrl:   { type: string }
 *                     qrCodeImage: { type: string, description: base64 }
 *                     orderCode:   { type: string }
 *                     amount:      { type: integer, example: 64000 }
 *                     description: { type: string, example: 'Thanh toan don hang' }
 *                     expiredAt:   { type: string, format: date-time }
 *       400:
 *         description: Giỏ hàng trống
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/checkout', OrderController.checkout);

module.exports = router;