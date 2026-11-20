// Mock Redis để không kết nối server thật
const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
};

jest.mock('../../shared/redis', () => ({
    getRedisClient: () => mockRedis,
}));
jest.mock('../../shared/logger', () => ({
    info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(),
}));

const CartService = require('./cart.service');

describe('Cart Service Tests', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('getCart: trả về mảng rỗng nếu user chưa có giỏ hàng', async () => {
        mockRedis.get.mockResolvedValue(null);

        const cart = await CartService.getCart('user_123');

        expect(mockRedis.get).toHaveBeenCalledWith('cart:user_123');
        expect(cart).toEqual([]);
    });

    test('getCart: lọc bỏ item không hợp lệ', async () => {
        mockRedis.get.mockResolvedValue(JSON.stringify([null, { quantity: 1 }, { name: 'A', quantity: 1 }]));
        const cart = await CartService.getCart('u');
        expect(cart).toEqual([{ name: 'A', quantity: 1 }]);
    });

    test('getCart: lỗi Redis → trả về mảng rỗng', async () => {
        mockRedis.get.mockRejectedValue(new Error('redis down'));
        expect(await CartService.getCart('u')).toEqual([]);
    });

    test('addItem: thêm món mới và lưu Redis với TTL 24h', async () => {
        mockRedis.get.mockResolvedValue(JSON.stringify([]));
        const newItem = { name: 'Trà Sữa', quantity: 1, size: 'M', unitPrice: 30000 };

        const updatedCart = await CartService.addItem('user_123', newItem);

        expect(updatedCart).toHaveLength(1);
        expect(updatedCart[0].name).toBe('Trà Sữa');
        expect(mockRedis.set).toHaveBeenCalledWith(
            'cart:user_123', JSON.stringify([newItem]), 'EX', 86400
        );
    });

    test('addItem: cộng dồn số lượng nếu cùng tên và cùng size', async () => {
        const existing = [{ name: 'Trà Sữa', quantity: 1, size: 'M', unitPrice: 30000 }];
        mockRedis.get.mockResolvedValue(JSON.stringify(existing));

        const updatedCart = await CartService.addItem('user_123', {
            name: 'Trà Sữa', quantity: 2, size: 'M', unitPrice: 30000,
        });

        expect(updatedCart).toHaveLength(1);
        expect(updatedCart[0].quantity).toBe(3);
    });

    test('addItem: khác size thì tạo dòng mới', async () => {
        mockRedis.get.mockResolvedValue(JSON.stringify([{ name: 'Trà Sữa', quantity: 1, size: 'M' }]));
        const cart = await CartService.addItem('u', { name: 'Trà Sữa', quantity: 1, size: 'L' });
        expect(cart).toHaveLength(2);
    });

    test('removeItem: xoá món theo tên', async () => {
        mockRedis.get.mockResolvedValue(JSON.stringify([{ name: 'A' }, { name: 'B' }]));
        const cart = await CartService.removeItem('u', 'A');
        expect(cart).toEqual([{ name: 'B' }]);
    });

    test('clearCart: xoá key giỏ hàng', async () => {
        await CartService.clearCart('u');
        expect(mockRedis.del).toHaveBeenCalledWith('cart:u');
    });

    test('checkRateLimit: cho phép đến 20 tin/phút, vượt thì chặn', async () => {
        mockRedis.incr.mockResolvedValueOnce(1);
        expect(await CartService.checkRateLimit('u')).toEqual({ allowed: true, remaining: 19 });
        expect(mockRedis.expire).toHaveBeenCalled();

        mockRedis.incr.mockResolvedValueOnce(21);
        expect(await CartService.checkRateLimit('u')).toEqual({ allowed: false, remaining: 0 });
    });
});
