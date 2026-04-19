const express = require('express');
const CartController = require('./cart.controller');

const router = express.Router();

/**
 * @swagger
 * /cart/{userId}:
 *   get:
 *     summary: Lấy giỏ hàng hiện tại của user
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *         description: Telegram user ID
 *         example: '123456789'
 *     responses:
 *       200:
 *         description: Giỏ hàng hiện tại
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CartItem'
 */
router.get('/:userId', CartController.getCart);

/**
 * @swagger
 * /cart/{userId}/items:
 *   post:
 *     summary: Thêm món vào giỏ hàng
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *         example: '123456789'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CartItem'
 *     responses:
 *       200:
 *         description: Thêm thành công, trả về giỏ hàng mới nhất
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CartItem'
 *       400:
 *         description: Thiếu thông tin hoặc món không tồn tại trong menu
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:userId/items', CartController.addItem);

/**
 * @swagger
 * /cart/{userId}:
 *   delete:
 *     summary: Xóa toàn bộ giỏ hàng của user
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *         example: '123456789'
 *     responses:
 *       200:
 *         description: Xóa thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:  { type: string, example: success }
 *                 message: { type: string, example: 'Đã xóa giỏ hàng' }
 */
router.delete('/:userId', CartController.clearCart);

module.exports = router;