'use strict';

const {PayOS} = require("@payos/node");
const crypto = require("crypto");
const { Payment } = require('./payment.model');
const { Order, OrderStatusLog } = require('../order/order.model');
const BotService = require('../bot/bot.service');
const logger = require('../../shared/logger');
const { validatePaymentOrder, validatePayosWebhook } = require('../../shared/validators');

// Khởi tạo
const payos = new PayOS(
    process.env.PAYOS_CLIENT_ID,
    process.env.PAYOS_API_KEY,
    process.env.PAYOS_CHECKSUM_KEY
);

const PaymentService = {
    /**
     * Tạo VietQR payment link cho một đơn hàng.
     * Được gọi từ OrderService.checkout() sau khi đơn đã lưu vào MongoDB.
     *
     * @param {object} order - Đơn hàng vừa tạo (từ MongoDB)
     * @returns {object} - { qrCode, checkoutUrl, orderCode, amount, description }
     */
    createPaymentLink: async (order) => {
    const check = validatePaymentOrder(order);
    if (!check.valid) {
        logger.error({ errors: check.errors }, 'Đơn hàng không hợp lệ, không tạo VietQR');
        throw new Error(`INVALID_PAYMENT_ORDER: ${check.errors.join('; ')}`);
    }
    try {
        // orderCode phải unique + số nguyên
        const orderCode =
            Math.floor(Date.now() / 1000) +
            Math.floor(Math.random() * 1000);

        const paymentData = {
            orderCode,
            amount: Math.round(order.totalAmount), // phải là integer
            description: `Thanh toan ${order.orderId}`.slice(0, 25), // ⚠️ max 25 ký tự
            returnUrl: `${process.env.PAYOS_WEBHOOK_URL}/success`,
            cancelUrl: `${process.env.PAYOS_WEBHOOK_URL}/cancel`,
            items: order.items.map(item => ({
                name: `${item.name} ${item.size}`.slice(0, 25), // ⚠️ PayOS giới hạn
                quantity: item.quantity,
                price: item.unitPrice,
            })),
        };

        // FIX CHÍNH: gọi đúng method SDK
        const payosResponse = await payos.paymentRequests.create(paymentData);

        // Lưu DB
        console.log("PAYOS RESPONSE:", payosResponse);
        const payment = await Payment.create({
            orderId: order.orderId,
            payosOrderCode: orderCode,
            payosPaymentLinkId: payosResponse.paymentLinkId || '',
            qrCode: payosResponse.qrCode || '',
            checkoutUrl: payosResponse.checkoutUrl || '',
            amount: order.totalAmount,
            status: 'PENDING',
        });

        logger.info(
            { orderId: order.orderId, orderCode },
            'Đã tạo VietQR thành công'
        );

        return {
            qrCode: payment.qrCode,
            checkoutUrl: payment.checkoutUrl,
            orderCode,
            amount: order.totalAmount,
            description: paymentData.description,
        };
    } catch (error) {
        logger.error(
            { err: error, orderId: order.orderId },
            'Lỗi khi tạo VietQR'
        );
        throw error;
        }
    },

    /**
     * Xác thực chữ ký webhook từ payOS (Manual logic)
     * Quy tắc: Sắp xếp các key của object 'data' theo alphabet, nối bằng &, sau đó băm HMAC-SHA256
     */
    verifyWebhookData: (webhookBody) => {
        try {
            const { data, signature } = webhookBody || {};
            if (!data || !signature) return null;

            const secret = process.env.PAYOS_CHECKSUM_KEY;
            if (!secret) {
                logger.error('Thiếu PAYOS_CHECKSUM_KEY, không thể xác thực webhook');
                return null;
            }

            // 1. Sắp xếp các key của data theo alphabet
            const sortedKeys = Object.keys(data).sort();
            
            // 2. Tạo chuỗi query string từ data (key1=val1&key2=val2...)
            const queryString = sortedKeys
                .map(key => `${key}=${data[key]}`)
                .join('&');

            // 3. Tính toán chữ ký bằng HMAC-SHA256 với Checksum Key
            const computedSignature = crypto
                .createHmac('sha256', secret)
                .update(queryString)
                .digest('hex');

            // 4. So sánh chữ ký (constant-time để chống timing attack)
            const a = Buffer.from(computedSignature);
            const b = Buffer.from(String(signature));
            if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
                return data;
            }
            
            logger.error('Chữ ký PayOS không khớp');
            return null;
        } catch (error) {
            logger.error({ err: error.message }, 'Lỗi xác thực chữ ký thủ công');
            return null;
        }
    },

    /**
     * Xử lý webhook từ payOS sau khi đã xác thực HMAC.
     * Áp dụng idempotency: bỏ qua nếu webhookEventId đã xử lý rồi.
     *
     * @param {object} webhookData - Parsed body từ payOS
     */
    handleWebhook: async (webhookData) => {
        const { code, data } = webhookData;

        // Chỉ xử lý khi thanh toán thực sự thành công
        if (code !== '00') {
            logger.info({ code, orderCode: data && data.orderCode }, 'Webhook payOS: giao dịch không thành công, bỏ qua');
            return;
        }

        // Validate schema payload (signature đã được verify ở bước trước)
        const shape = validatePayosWebhook({ ...webhookData, signature: webhookData.signature || 'verified' });
        if (!shape.valid) {
            logger.error({ errors: shape.errors }, 'Webhook payOS: payload sai schema, bỏ qua');
            return;
        }
        const orderCode = Number(data.orderCode);
        const { reference: webhookEventId, amount } = data;

        try {
            // Idempotency check: nếu đã xử lý webhookEventId này rồi thì skip
            const existing = await Payment.findOne({ webhookEventId });
            if (existing) {
                logger.warn({ webhookEventId }, 'Webhook duplicate — đã xử lý trước đó, bỏ qua');
                return;
            }

            // Tìm payment record theo orderCode
            const payment = await Payment.findOne({ payosOrderCode: orderCode });
            if (!payment) {
                logger.error({ orderCode }, 'Webhook: không tìm thấy payment record');
                return;
            }

            // Số tiền thực nhận phải khớp số tiền của đơn
            if (Number(amount) !== Math.round(payment.amount)) {
                logger.error({ orderCode, expected: payment.amount, received: amount }, 'Webhook: số tiền không khớp, bỏ qua');
                return;
            }

            // Cập nhật trạng thái payment → SUCCESS
            payment.status = 'SUCCESS';
            payment.webhookEventId = webhookEventId;
            payment.paidAt = new Date();
            await payment.save();

            // Cập nhật trạng thái đơn hàng → QUEUED (chờ làm)
            const order = await Order.findOne({ orderId: payment.orderId });
            if (order) {
                const oldStatus = order.status;
                order.status = 'QUEUED';
                await order.save();

                // Ghi audit log
                await OrderStatusLog.create({
                    orderId: order.orderId,
                    oldStatus,
                    newStatus: 'QUEUED',
                    changedBy: 'webhook',
                    note: `payOS xác nhận thanh toán, eventId: ${webhookEventId}`,
                });

                logger.info({ orderId: order.orderId, webhookEventId }, 'Đơn hàng đã thanh toán → QUEUED');

                // Thông báo cho khách qua Telegram
                await BotService.sendMessage(
                    order.telegramUserId,
                    `<b>Thanh toán thành công!</b>\n\nMình đã nhận được tiền cho đơn hàng <code>${order.orderId}</code> rồi nhé. Quán đang bắt đầu làm món cho bạn đây ạ! 🧋`
                );
            }

            return { orderId: payment.orderId, newStatus: 'QUEUED' };
        } catch (error) {
            // Nếu lỗi do duplicate key (webhookEventId) → idempotency đang hoạt động đúng
            if (error.code === 11000) {
                logger.warn({ webhookEventId }, 'Webhook duplicate bị chặn bởi MongoDB unique index');
                return;
            }
            logger.error({ err: error, orderCode }, 'Lỗi xử lý webhook payOS');
            throw error;
        }
    },
};

module.exports = PaymentService;
