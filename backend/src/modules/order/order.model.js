const mongoose = require('mongoose');

// Định nghĩa các trạng thái chuẩn của hệ thống
const ORDER_STATUS = ['PENDING_PAYMENT', 'QUEUED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const ITEM_SIZE = ['M', 'L'];


// 1. Schema: Chi tiết món ăn 
const orderItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    size: { type: String, enum: ITEM_SIZE, default: 'M' },
    unitPrice: { type: Number, required: true },
    note: { type: String, default: '' }
}, { _id: false }); // Tắt _id tự động để payload nhẹ hơn


// 2. Schema: Đơn hàng chính (Order)
const orderSchema = new mongoose.Schema({
    orderId: { type: String, required: true, unique: true }, // Mã dạng DH_123456
    telegramUserId: { type: String, required: true, index: true },
    customerName: { type: String, required: true },
    items: [orderItemSchema], 
    totalAmount: { type: Number, required: true },
    status: { 
        type: String, 
        enum: ORDER_STATUS, 
        default: 'PENDING_PAYMENT', 
        index: true 
    },
    webhookEventId: { 
        type: String, 
        sparse: true, 
        unique: true 
        // Sparse Unique: Đây là "vũ khí" chống duplicate. Nếu payOS gửi 2 webhook cùng 1 eventId, DB sẽ chặn cái thứ 2 lại.
    }
}, { timestamps: true });


// Tối ưu hóa tốc độ load danh sách đơn hàng mới nhất trên Dashboard
orderSchema.index({ createdAt: -1 });


// 3. Schema: Lịch sử thay đổi trạng thái (Audit Trail)
const orderStatusLogSchema = new mongoose.Schema({
    orderId: { type: String, required: true, index: true },
    oldStatus: { type: String, enum: ORDER_STATUS },
    newStatus: { type: String, enum: ORDER_STATUS, required: true },
    changedBy: { type: String, default: 'system' }, // Phân biệt hệ thống tự đổi hay Admin đổi
    note: { type: String }
}, { timestamps: true });


// Đăng ký và xuất các Model
const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
const OrderStatusLog = mongoose.models.OrderStatusLog || mongoose.model('OrderStatusLog', orderStatusLogSchema);


module.exports = {
    Order,
    OrderStatusLog,
    ORDER_STATUS,
    ITEM_SIZE
};