const OrderService = require('./order.service');
const { Order, OrderStatusLog } = require('./order.model');

// Làm giả (Mock) Mongoose Models
jest.mock('./order.model', () => ({
    Order: jest.fn(),
    OrderStatusLog: {
        create: jest.fn()
    }
}));

describe('OrderService CRUD Tests', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('createOrder: Nên tạo đơn hàng thành công và ghi log', async () => {
        const mockOrderData = { orderId: 'DH_123', totalAmount: 50000, customerName: 'Test' };
        
        // Cấu hình Mock behavior
        const mockSave = jest.fn().mockResolvedValue({ ...mockOrderData, status: 'Chờ thanh toán' });
        Order.mockImplementation(() => ({ save: mockSave }));
        OrderStatusLog.create.mockResolvedValue(true);

        // Gọi hàm cần test
        const result = await OrderService.createOrder(mockOrderData);

        // Kiểm tra kết quả
        expect(Order).toHaveBeenCalledWith(mockOrderData);
        expect(mockSave).toHaveBeenCalled();
        expect(OrderStatusLog.create).toHaveBeenCalledWith({
            orderId: 'DH_123',
            newStatus: 'Chờ thanh toán',
            note: 'Khởi tạo đơn hàng từ Telegram'
        });
        expect(result.orderId).toBe('DH_123');
    });

    test('updateOrderStatus: Nên quăng lỗi nếu không tìm thấy đơn', async () => {
        Order.findOne = jest.fn().mockResolvedValue(null);

        // Chờ đợi hàm ném ra lỗi
        await expect(OrderService.updateOrderStatus('INVALID_ID', 'Xong'))
            .rejects
            .toThrow('ORDER_NOT_FOUND');
    });
});