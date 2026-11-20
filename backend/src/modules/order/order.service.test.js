// Mock toàn bộ phụ thuộc ngoài (Mongo, Redis, PayOS)
jest.mock('./order.model', () => ({
    Order: jest.fn(),
    OrderStatusLog: { create: jest.fn() },
}));
jest.mock('../cart/cart.service', () => ({
    getCart: jest.fn(),
    clearCart: jest.fn(),
}));
jest.mock('../menu/menu.service', () => ({ getPrice: jest.fn() }));
jest.mock('../payment/payment.service', () => ({ createPaymentLink: jest.fn() }));
jest.mock('../../shared/logger', () => ({
    info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(),
}));

const OrderService = require('./order.service');
const { Order, OrderStatusLog } = require('./order.model');
const CartService = require('../cart/cart.service');
const MenuService = require('../menu/menu.service');
const PaymentService = require('../payment/payment.service');

describe('OrderService Tests', () => {
    beforeEach(() => {
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });
    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    test('createOrder: tạo đơn hàng thành công và ghi log', async () => {
        const mockOrderData = { orderId: 'DH_123', totalAmount: 50000, customerName: 'Test' };
        const mockSave = jest.fn().mockResolvedValue({ ...mockOrderData, status: 'Chờ thanh toán' });
        Order.mockImplementation(() => ({ save: mockSave }));
        OrderStatusLog.create.mockResolvedValue(true);

        const result = await OrderService.createOrder(mockOrderData);

        expect(Order).toHaveBeenCalledWith(mockOrderData);
        expect(mockSave).toHaveBeenCalled();
        expect(OrderStatusLog.create).toHaveBeenCalledWith({
            orderId: 'DH_123',
            newStatus: 'Chờ thanh toán',
            note: 'Khởi tạo đơn hàng từ Telegram',
        });
        expect(result.orderId).toBe('DH_123');
    });

    test('updateOrderStatus: ném lỗi nếu không tìm thấy đơn', async () => {
        Order.findOne = jest.fn().mockResolvedValue(null);
        await expect(OrderService.updateOrderStatus('INVALID_ID', 'Xong'))
            .rejects.toThrow('ORDER_NOT_FOUND');
    });

    test('updateOrderStatus: đổi trạng thái và ghi audit log', async () => {
        const order = { status: 'QUEUED', save: jest.fn().mockResolvedValue({ status: 'DONE' }) };
        Order.findOne = jest.fn().mockResolvedValue(order);

        await OrderService.updateOrderStatus('DH_1', 'DONE', 'admin', 'xong');

        expect(order.status).toBe('DONE');
        expect(OrderStatusLog.create).toHaveBeenCalledWith({
            orderId: 'DH_1', oldStatus: 'QUEUED', newStatus: 'DONE', changedBy: 'admin', note: 'xong',
        });
    });

    test('checkout: ném CART_EMPTY khi giỏ trống', async () => {
        CartService.getCart.mockResolvedValue([]);
        await expect(OrderService.checkout('u1', 'Thu')).rejects.toThrow('CART_EMPTY');
        expect(PaymentService.createPaymentLink).not.toHaveBeenCalled();
    });

    test('checkout: tính tiền theo giá menu (không tin giá client), tạo link và xoá giỏ', async () => {
        CartService.getCart.mockResolvedValue([
            { name: 'Trà Sữa', size: 'L', quantity: 2, unitPrice: 1 },
        ]);
        MenuService.getPrice.mockReturnValue(40000);
        const saved = { orderId: 'DH_999', status: 'PENDING_PAYMENT', totalAmount: 80000 };
        Order.mockImplementation(() => ({ save: jest.fn().mockResolvedValue(saved) }));
        OrderStatusLog.create.mockResolvedValue(true);
        PaymentService.createPaymentLink.mockResolvedValue({ orderCode: 111 });

        const result = await OrderService.checkout('u1', 'Thu');

        expect(Order.mock.calls[0][0]).toMatchObject({
            telegramUserId: 'u1',
            totalAmount: 80000,
            status: 'PENDING_PAYMENT',
        });
        expect(PaymentService.createPaymentLink).toHaveBeenCalledWith(saved);
        expect(CartService.clearCart).toHaveBeenCalledWith('u1');
        expect(result.payment.orderCode).toBe(111);
    });

    test('checkout: không xoá giỏ nếu tạo link thanh toán thất bại', async () => {
        CartService.getCart.mockResolvedValue([{ name: 'A', size: 'M', quantity: 1 }]);
        MenuService.getPrice.mockReturnValue(10000);
        Order.mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ orderId: 'X', status: 'S' }) }));
        PaymentService.createPaymentLink.mockRejectedValue(new Error('PAYOS_DOWN'));

        await expect(OrderService.checkout('u1', 'Thu')).rejects.toThrow('PAYOS_DOWN');
        expect(CartService.clearCart).not.toHaveBeenCalled();
    });
});
