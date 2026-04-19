const { Order, OrderStatusLog } = require('./order.model');
const logger = require('../../shared/logger');
const CartService = require('../cart/cart.service');
const MenuService = require('../menu/menu.service');
const PaymentService = require('../payment/payment.service');

const OrderService = {
    // 1. CREATE: Tạo đơn hàng mới từ giỏ hàng
    createOrder: async (orderData) => {
        try {
            const newOrder = new Order(orderData);
            const savedOrder = await newOrder.save();
            
            // Ghi log trạng thái khởi tạo
            await OrderStatusLog.create({
                orderId: savedOrder.orderId,
                newStatus: savedOrder.status,
                note: 'Khởi tạo đơn hàng từ Telegram'
            });

            return savedOrder;
        } catch (error) {
            logger.error('Lỗi khi tạo đơn hàng (Service):', error);
            console.log(error);
            throw error; // Quăng lỗi lên cho Controller xử lý
        }
    },

    // 2. READ: Lấy danh sách đơn hàng (có phân trang và filter)
    getOrders: async (filter = {}, limit = 10, skip = 0) => {
        return await Order.find(filter)
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip)
            .lean(); // Dùng .lean() để tăng tốc độ đọc dữ liệu
    },

    // 3. READ: Lấy chi tiết 1 đơn hàng theo orderId
    getOrderById: async (orderId) => {
        const order = await Order.findOne({ orderId }).lean();
        if (!order) throw new Error('ORDER_NOT_FOUND');
        return order;
    },

    // 4. UPDATE: Cập nhật trạng thái đơn hàng (Kèm Audit Log)
    updateOrderStatus: async (orderId, newStatus, changedBy = 'system', note = '') => {
        const order = await Order.findOne({ orderId });
        if (!order) throw new Error('ORDER_NOT_FOUND');

        const oldStatus = order.status;
        order.status = newStatus;
        const updatedOrder = await order.save();

        // Ghi vào sổ nhật ký thay đổi
        await OrderStatusLog.create({
            orderId,
            oldStatus,
            newStatus,
            changedBy,
            note
        });

        return updatedOrder;
    },

    // thanh toan
    checkout: async (telegramUserId, customerName) => {
        try {
            console.log(telegramUserId, customerName);
            const cartItems = await CartService.getCart(telegramUserId);
            if (!cartItems || cartItems.length === 0) {
                throw new Error('CART_EMPTY');
            }

            let totalAmount = 0;
            const finalItems = [];

            for (const item of cartItems) {
                // Phải lấy giá chuẩn từ hệ thống MenuCatalog 
                const realPrice = MenuService.getPrice(item.name, item.size);
                const quantity = Number(item.quantity) || 1;
                const itemTotal = realPrice * quantity;
                
                logger.info({ 
                    item: item.name, 
                    unitPrice: realPrice, 
                    qty: quantity, 
                    subTotal: itemTotal 
                }, '>>> ĐANG TÍNH TIỀN MÓN');

                totalAmount += itemTotal;
                
                finalItems.push({
                    name: item.name,
                    quantity: quantity,
                    size: item.size,
                    unitPrice: realPrice,
                    note: item.note || ''
                });
            }

            // Tạo mã đơn hàng duy nhất (Ví dụ: DH_783219)
            const orderId = `DH_${Math.floor(100000 + Math.random() * 900000)}`;

            // Lưu đơn hàng vào MongoDB (Gọi lại hàm createOrder của chính file này)
            const orderData = {
                orderId,
                telegramUserId,
                customerName,
                items: finalItems,
                totalAmount,
                status: 'PENDING_PAYMENT'
            };

            const newOrder = await OrderService.createOrder(orderData);

            // 11. Tạo payment link (QR + checkoutUrl)
            const paymentInfo = await PaymentService.createPaymentLink(newOrder);

            // 12. Chỉ xóa giỏ hàng khi MỌI THỨ đã thành công (bao gồm tạo link thanh toán)
            await CartService.clearCart(telegramUserId);

            logger.info({ orderId, orderCode: paymentInfo.orderCode }, 'Đã chốt đơn và tạo thanh toán thành công');

            return {
                order: newOrder,
                payment: paymentInfo,
            };
        }
        catch (error) {
            logger.error({ err: error.message, telegramUserId }, 'Lỗi trong quá trình Checkout');
            throw error;
        }
    }
};

module.exports = OrderService;