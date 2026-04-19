const OrderService = require('./order.service');
const CartService = require('../cart/cart.service');
const MenuService = require('../menu/menu.service');
const RealtimeService = require('../realtime/realtime.service');

const OrderController = {
    create: async (req, res) => {
        try {
            const orderData = req.body;

            // Auto-generate orderId nếu không được truyền vào (dạng DH_123456)
            if (!orderData.orderId) {
                orderData.orderId = `DH_${Math.floor(100000 + Math.random() * 900000)}`;
            }

            // Tự tính totalAmount từ items nếu không được truyền vào, fallback về 0
            if (!orderData.totalAmount) {
                orderData.totalAmount = Array.isArray(orderData.items) && orderData.items.length > 0
                    ? orderData.items.reduce((sum, item) => sum + (item.unitPrice || 0) * (item.quantity || 1), 0)
                    : 0;
            }

            const newOrder = await OrderService.createOrder(orderData);
            res.status(201).json({ status: 'success', data: newOrder });
        } catch (error) {
            res.status(400).json({ status: 'error', message: error.message });
        }
    },

    getAll: async (req, res) => {
        try {
            const { status, limit = 10, skip = 0 } = req.query;
            const filter = status ? { status } : {};
            
            const orders = await OrderService.getOrders(filter, Number(limit), Number(skip));
            res.status(200).json({ status: 'success', data: orders });
        } catch (error) {
            res.status(500).json({ status: 'error', message: 'Lỗi server' });
        }
    },

    getOne: async (req, res) => {
        try {
            const { id } = req.params;
            const order = await OrderService.getOrderById(id);
            res.status(200).json({ status: 'success', data: order });
        } catch (error) {
            if (error.message === 'ORDER_NOT_FOUND') {
                return res.status(404).json({ status: 'error', message: 'Không tìm thấy đơn hàng' });
            }
            res.status(500).json({ status: 'error', message: error.message });
        }
    },

    updateStatus: async (req, res) => {
        try {
            const { id } = req.params;
            const { status, changedBy, note } = req.body;
            
            const updatedOrder = await OrderService.updateOrderStatus(id, status, changedBy, note);
            
            // NẾU LÀ ADMIN ĐỔI TRẠNG THÁI: Phát realtime qua Socket cho Dashboard
            RealtimeService.emitOrderStatusChanged(updatedOrder);

            // GỬI THÔNG BÁO CHO KHÁCH QUA TELEGRAM
            if (status === 'COMPLETED' && updatedOrder.telegramUserId) {
                const BotService = require('../bot/bot.service');
                await BotService.sendMessage(updatedOrder.telegramUserId, 
                    `✨ <b>Tin vui đây ạ!</b>\n\nMón của bạn (Đơn: <code>${updatedOrder.orderId}</code>) đã được cô chủ chuẩn bị xong xuôi rồi nhé. Bạn chờ một xíu để shipper giao đến cho bạn nhé! ❤️`
                );
            } else if (status === 'IN_PROGRESS' && updatedOrder.telegramUserId) {
                const BotService = require('../bot/bot.service');
                await BotService.sendMessage(updatedOrder.telegramUserId,
                    `☕️ <b>Quán đang thực hiện món cho bạn...</b>\n\nĐơn hàng <code>${updatedOrder.orderId}</code> đã được đưa vào bếp rồi nhé. Bạn đợi cô chủ một xíu nha!`
                );
            }

            res.status(200).json({ status: 'success', data: updatedOrder });
        } catch (error) {
            res.status(400).json({ status: 'error', message: error.message });
        }
    },
    
    checkout: async (req, res) => {
        try {
            const { telegramUserId, customerName } = req.body;
            if (!telegramUserId || !customerName) {
                return res.status(400).json({ status: 'error', message: 'Thiếu thông tin người dùng' });
            }

            // checkout() giờ trả về { order, payment }
            const { order, payment } = await OrderService.checkout(telegramUserId, customerName);

            res.status(200).json({
                status: 'success',
                data: {
                    orderId: order.orderId,
                    totalAmount: order.totalAmount,
                    status: order.status,
                    items: order.items,
                    payment: {
                        orderCode: payment.orderCode,
                        amount: payment.amount,
                        description: payment.description,
                        checkoutUrl: payment.checkoutUrl,
                        qrCode: payment.qrCode,
                    }
                }
            });
        } catch (error) {
            if (error.message === 'CART_EMPTY') {
                return res.status(400).json({ status: 'error', message: 'Giỏ hàng đang trống' });
            }
            res.status(500).json({ status: 'error', message: error.message || 'Lỗi server khi chốt đơn' });
        }
    }
    
};

module.exports = OrderController;