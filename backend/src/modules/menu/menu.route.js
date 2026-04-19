'use strict';

const express = require('express');
const MenuController = require('./menu.controller');
const router = express.Router();

/**
 * @swagger
 * /menu:
 *   get:
 *     summary: Lấy danh sách tất cả món (chỉ những món đang bán)
 *     tags: [Menu]
 *     responses:
 *       200:
 *         description: Danh sách tất cả món đang available
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - status
 *                 - data
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     required:
 *                       - item_id
 *                       - name
 *                       - price_m
 *                       - price_l
 *                       - category
 *                       - available
 *                     properties:
 *                       item_id:
 *                         type: string
 *                         example: TS01
 *                       name:
 *                         type: string
 *                         example: Trà Sữa Trân Châu Đen
 *                       description:
 *                         type: string
 *                         example: Trà sữa thơm béo với trân châu đen dai ngon
 *                       price_m:
 *                         type: integer
 *                         example: 35000
 *                       price_l:
 *                         type: integer
 *                         example: 45000
 *                       category:
 *                         type: string
 *                         example: Trà Sữa
 *                       available:
 *                         type: boolean
 *                         example: true
 */
router.get('/', MenuController.getAll);

/**
 * @swagger
 * /menu/search:
 *   get:
 *     summary: Tìm kiếm món theo tên (fuzzy match)
 *     tags: [Menu]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Tên món cần tìm (chấp nhận sai chính tả ≤ 2 ký tự)
 *         example: tra dau
 *     responses:
 *       200:
 *         description: Kết quả tìm kiếm
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: Trà dâu tây
 *                     price_m:
 *                       type: integer
 *                       example: 32000
 *                     price_l:
 *                       type: integer
 *                       example: 42000
 *       400:
 *         description: Lỗi đầu vào
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Thiếu query parameter q
 */
router.get('/search', MenuController.search);

module.exports = router;