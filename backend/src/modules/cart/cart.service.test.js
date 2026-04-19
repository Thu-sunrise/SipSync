const CartService = require('./cart.service');
const redisClient = require('../../shared/redis');

// Mock toàn bộ module redis để không kết nối đến server thật
jest.mock('../../shared/redis', () => {
    const mPipeline = {
        set: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([])
    };
    return {
        get: jest.fn(),
        del: jest.fn(),
        pipeline: jest.fn(() => mPipeline)
    };
});

describe('Cart Service Tests', () => {
    afterEach(() => {
        jest.clearAllMocks(); // Xóa lịch sử gọi hàm sau mỗi test
    });

    test('getCart: Nên trả về mảng rỗng nếu user chưa có giỏ hàng', async () => {
        redisClient.get.mockResolvedValue(null);
        
        const cart = await CartService.getCart('user_123');
        
        expect(redisClient.get).toHaveBeenCalledWith('cart:user_123');
        expect(cart).toEqual([]); // Mong đợi một mảng rỗng
    });

    test('addItem: Nên thêm món mới và gọi pipeline thành công', async () => {
        // Giả lập giỏ hàng hiện tại đang rỗng
        redisClient.get.mockResolvedValue(JSON.stringify([]));
        
        const newItem = { name: 'Trà Sữa', quantity: 1, size: 'M', unitPrice: 30000 };
        const updatedCart = await CartService.addItem('user_123', newItem);

        // Kiểm tra xem món đã vào giỏ chưa
        expect(updatedCart.length).toBe(1);
        expect(updatedCart[0].name).toBe('Trà Sữa');

        // Kiểm tra xem pipeline có được gọi đúng không
        expect(redisClient.pipeline).toHaveBeenCalled();
        const pipelineInstance = redisClient.pipeline();
        expect(pipelineInstance.set).toHaveBeenCalledWith('cart:user_123', JSON.stringify([newItem]));
        expect(pipelineInstance.expire).toHaveBeenCalledWith('cart:user_123', 86400); // 24h
        expect(pipelineInstance.exec).toHaveBeenCalled();
    });

    test('addItem: Nên cộng dồn số lượng nếu món đã tồn tại (cùng tên, cùng size)', async () => {
        // Giả lập trong giỏ đã có 1 ly Trà Sữa size M
        const existingCart = [{ name: 'Trà Sữa', quantity: 1, size: 'M', unitPrice: 30000 }];
        redisClient.get.mockResolvedValue(JSON.stringify(existingCart));
        
        // Khách mua thêm 2 ly y chang
        const additionalItem = { name: 'Trà Sữa', quantity: 2, size: 'M', unitPrice: 30000 };
        const updatedCart = await CartService.addItem('user_123', additionalItem);

        // Mong đợi giỏ hàng vẫn chỉ có 1 dòng, nhưng quantity = 3
        expect(updatedCart.length).toBe(1);
        expect(updatedCart[0].quantity).toBe(3);
    });
});