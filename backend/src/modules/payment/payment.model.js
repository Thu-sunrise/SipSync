'use strict';

const mongoose = require('mongoose');

const PAYMENT_STATUS = ['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED'];

// Schema thanh toán — lưu thông tin VietQR và kết quả webhook từ payOS
const paymentSchema = new mongoose.Schema(
    {
        // Liên kết đến đơn hàng (dùng orderId dạng string như 'DH_123456')
        orderId: { type: String, required: true, index: true },

        // Mã đơn số nguyên cấp cho payOS (phải unique)
        payosOrderCode: { type: Number, required: true, unique: true },

        // Payment link ID từ payOS response
        payosPaymentLinkId: { type: String, default: '' },

        // QR code image (base64 hoặc URL)
        qrCode: { type: String, default: '' },

        // URL thanh toán
        checkoutUrl: { type: String, default: '' },

        // Số tiền (VND)
        amount: { type: Number, required: true },

        // Trạng thái thanh toán
        status: {
            type: String,
            enum: PAYMENT_STATUS,
            default: 'PENDING',
        },

        // Idempotency key — sparse unique: chống duplicate webhook từ payOS
        // Nếu payOS gửi 2 webhook cùng 1 eventId, DB sẽ chặn cái thứ 2
        webhookEventId: {
            type: String,
            unique: true,
            sparse: true,   // chỉ enforce unique khi field tồn tại (không phải null)
        },

        // Thời điểm thanh toán thành công
        paidAt: { type: Date, default: null },
    },
    { timestamps: true }
);


const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);

module.exports = { Payment, PAYMENT_STATUS };
