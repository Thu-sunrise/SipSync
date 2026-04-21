const {getRedisClient} = require('../../shared/redis');
const logger = require('../../shared/logger');

// Thời gian sống (Time-To-Live) của giỏ hàng là 24 giờ (86400 giây)
const TTL_24H = 86400; 
const redisClient = getRedisClient();

const CartService = {
    // lấy giỏ hàng
    getCart: async (userId) => {
        try {
            const data = await redisClient.get(`cart:${userId}`);
            const cart = data ? JSON.parse(data) : [];
            // Vệ sinh dữ liệu: Chỉ lấy những món có tên hợp lệ
            return cart.filter(item => item && item.name);
        } catch (error) {
            logger.error(`Lỗi lấy giỏ hàng của user ${userId}:`, { error: error.message });
            return [];
        }
    },

    // 2. thêm món vào giỏ (Có gộp món giống nhau)
    addItem: async (userId, item) => {
        try {
            logger.info({ userId, item }, '>>> ĐANG THÊM MÓN VÀO GIỎ');
            const key = `cart:${userId}`;
            let cart = await CartService.getCart(userId);
            
            const existingItemIndex = cart.findIndex(
                i => i.name === item.name && i.size === item.size
            );

            if (existingItemIndex > -1) {
                cart[existingItemIndex].quantity += item.quantity;
            } else {
                cart.push(item);
            }

            await redisClient.set(key, JSON.stringify(cart), 'EX', TTL_24H);
            logger.info({ userId, cartSize: cart.length }, '>>> ĐÃ LƯU GIỎ HÀNG THÀNH CÔNG');

            return cart;
        } catch (error) {
            logger.error(`Lỗi thêm món cho user ${userId}:`, { error: error.message });
            throw error;
        }
    },

    // 2.1 Cập nhật món trong giỏ (ghi đè size, quantity, note)
    updateItem: async (userId, item) => {
        try {
            logger.info({ userId, item }, '>>> ĐANG CẬP NHẬT MÓN TRONG GIỎ');
            const key = `cart:${userId}`;
            let cart = await CartService.getCart(userId);
            
            // Tìm món cùng tên để cập nhật
            const existingItemIndex = cart.findIndex(i => i.name === item.name);

            if (existingItemIndex > -1) {
                cart[existingItemIndex] = { ...cart[existingItemIndex], ...item };
                await redisClient.set(key, JSON.stringify(cart), 'EX', TTL_24H);
                logger.info({ userId, cartSize: cart.length }, '>>> ĐÃ CẬP NHẬT GIỎ HÀNG THÀNH CÔNG');
            } else {
                // Nếu không tìm thấy món để update, ta tự động thêm mới
                return CartService.addItem(userId, item);
            }
            return cart;
        } catch (error) {
            logger.error(`Lỗi cập nhật món cho user ${userId}:`, { error: error.message });
            throw error;
        }
    },

    // 2.2 Xoá món khỏi giỏ
    removeItem: async (userId, itemName) => {
        try {
            logger.info({ userId, itemName }, '>>> ĐANG XOÁ MÓN KHỎI GIỎ');
            const key = `cart:${userId}`;
            let cart = await CartService.getCart(userId);
            
            cart = cart.filter(i => i.name !== itemName);
            await redisClient.set(key, JSON.stringify(cart), 'EX', TTL_24H);
            
            return cart;
        } catch (error) {
            logger.error(`Lỗi xoá món cho user ${userId}:`, { error: error.message });
            throw error;
        }
    },

    // 3. xóa trắng giỏ hàng (Dùng khi khách đã thanh toán xong)
    clearCart: async (userId) => {
        try {
            logger.warn({ userId }, '!!! ĐANG XÓA GIỎ HÀNG');
            await redisClient.del(`cart:${userId}`);
        } catch (error) {
            logger.error(`Lỗi xóa giỏ hàng user ${userId}:`, { error: error.message });
        }
    },

    clearHistory: async (userId) => {
        try {
            logger.warn({ userId }, '!!! ĐANG XÓA LỊCH SỬ CHAT');
            await redisClient.del(`chat_history:${userId}`);
        } catch (error) {
            logger.error(`Lỗi xóa lịch sử chat user ${userId}:`, { error: error.message });
        }
    },

    // 4. Quản lý lịch sử hội thoại
    getHistory: async (userId) => {
        try {
            const history = await redisClient.lrange(`chat_history:${userId}`, 0, 19);
            return history.map(h => JSON.parse(h)).reverse();
        } catch (error) {
            logger.error(`Lỗi lấy history của user ${userId}:`, { error: error.message });
            return [];
        }
    },

    appendHistory: async (userId, message) => {
        try {
            const key = `chat_history:${userId}`;
            await redisClient.lpush(key, JSON.stringify(message));
            await redisClient.ltrim(key, 0, 19);
            await redisClient.expire(key, TTL_24H);
        } catch (error) {
            logger.error(`Lỗi lưu history user ${userId}:`, { error: error.message });
        }
    },

    // 5. Rate limiting (20 msg/phút)
    checkRateLimit: async (userId) => {
        try {
            const minute = Math.floor(Date.now() / 60000);
            const key = `rate_limit:${userId}:${minute}`;
            const count = await redisClient.incr(key);
            if (count === 1) {
                await redisClient.expire(key, 60);
            }
            return {
                allowed: count <= 20,
                remaining: Math.max(0, 20 - count)
            };
        } catch (error) {
            logger.error(`Lỗi check rate limit user ${userId}:`, { error: error.message });
            return { allowed: true, remaining: 1 };
        }
    }
};

module.exports = CartService;