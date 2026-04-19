'use strict';

const logger = require('../../shared/logger');

let io = null;

/**
 * RealtimeService quản lý việc phát tín hiệu (Emit) qua Socket.io
 * Được thiết kế theo dạng Singleton để truy cập từ mọi Service/Controller
 */
const RealtimeService = {
    /**
     * Khởi tạo io instance (Gắn vào server.js)
     */
    init: (ioInstance) => {
        io = ioInstance;
        logger.info('[RealtimeService] Đã khởi tạo Socket.io thành công');
    },

    /**
     * Phát tín hiệu khi có đơn hàng đã thanh toán
     */
    emitOrderPaid: (orderData) => {
        if (!io) return;
        io.to('admin-orders').emit('ORDER_PAID', orderData);
        logger.info({ orderId: orderData.orderId }, '[Socket] Phát ORDER_PAID');
    },

    /**
     * Phát tín hiệu khi trạng thái đơn hàng thay đổi
     */
    emitOrderStatusChanged: (orderData) => {
        if (!io) return;
        io.to('admin-orders').emit('ORDER_STATUS_CHANGED', orderData);
        logger.info({ orderId: orderData.orderId, status: orderData.status }, '[Socket] Phát ORDER_STATUS_CHANGED');
    },

    /**
     * Phát tín hiệu khi có đơn hàng mới (Pending)
     */
    emitNewOrder: (orderData) => {
        if (!io) return;
        io.to('admin-orders').emit('NEW_ORDER', orderData);
    }
};

module.exports = RealtimeService;
