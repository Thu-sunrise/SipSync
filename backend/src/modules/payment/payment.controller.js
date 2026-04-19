'use strict';

const PaymentService = require('./payment.service');
const logger = require('../../shared/logger');

const PaymentController = {
    /**
     * POST /webhook/payos
     * Nhận webhook từ payOS, xác thực HMAC, cập nhật đơn hàng.
     *
     * QUAN TRỌNG: Middleware express.raw() phải được áp dụng TRƯỚC route này
     * (không dùng express.json()) để lấy rawBody phục vụ xác thực HMAC.
     */
    handleWebhook: async (req, res) => {
        logger.info('>>> NHẬN ĐƯỢC WEBHOOK TỪ PAYOS');
        
        // Dùng luôn req.body (đã được express.json() parse)
        const webhookBody = req.body;
        const verifiedData = PaymentService.verifyWebhookData(webhookBody);

        if (!verifiedData) {
            logger.warn('[PayOS Webhook] Chữ ký không hợp lệ — từ chối');
            return res.status(400).json({ status: 'error', message: 'Invalid signature' });
        }

        try {
            // verifiedData chính là object 'data' bên trong webhookBody sau khi verify thành công
            const result = await PaymentService.handleWebhook({ ...webhookBody, data: verifiedData });

            // Trả về 200 cho payOS
            res.status(200).json({ success: true });

            // Broadcast realtime đến Admin Dashboard
            if (result?.orderId) {
                const RealtimeService = require('../realtime/realtime.service');
                RealtimeService.emitOrderPaid({
                    orderId: result.orderId,
                    newStatus: result.newStatus,
                });
            }
        } catch (error) {
            logger.error({ err: error.message }, '[PayOS Webhook] Lỗi xử lý webhook');
            return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
        }
    },
};

module.exports = PaymentController;
