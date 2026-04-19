const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');

// Import các hạ tầng dùng chung
const { connectDB }= require('./shared/db');
const { getRedisClient } = require('./shared/redis');
const logger = require('./shared/logger');
const MenuModel = require('./modules/menu/menu.model');
const RealtimeService = require('./modules/realtime/realtime.service');

// port
const PORT = process.env.PORT || 8000;

// 1. Tạo HTTP server từ Express app
const server = http.createServer(app);

// 2. Khởi tạo Socket.io
const io = new Server(server, {
    cors: {
        origin: "*", // Cho phép Dashboard kết nối
        methods: ["GET", "POST", "PATCH"]
    }
});

// Gắn io vào app và khởi tạo RealtimeService
app.set('io', io);

RealtimeService.init(io);
io.on('connection', (socket) => {
    logger.info(`[Socket] Client kết nối: ${socket.id}`);
    socket.on('SUBSCRIBE_ORDERS', () => {
        socket.join('admin-orders');
        logger.info(`Client ${socket.id} đã tham gia phòng admin-orders`);
    });

    socket.on('disconnect', () => {
        logger.info(`[Socket] Client ngắt kết nối: ${socket.id}`);
    });
});


// 3. Hàm khởi động hệ thống (Bootstrap)
const startServer = async () => {
    try {
        logger.info('Đang khởi động hệ thống...');

        // Kết nối MongoDB
        await connectDB();

        // Nạp Menu từ CSV 
        await MenuModel.reload();
        
        // connect redis
        const redisClient = getRedisClient();
        // Nếu Redis đã sẵn sàng (reuse connection) thì không chờ event 'ready' nữa
        if (redisClient.status !== 'ready') {
            await new Promise((resolve, reject) => {
                redisClient.once('ready', resolve);
                redisClient.once('error', reject);
            });
        }
        logger.info('Redis đã sẵn sàng');

        // Mở port mạng
        server.listen(PORT, () => {
            logger.info(`SipSync Server đang chạy tại: http://localhost:${PORT}`);
            logger.info(`Health check: http://localhost:${PORT}/health`);
        });


    } catch (error) {
        console.error('🚨 LỖI CHI TIẾT:', error);
        logger.error('Thất bại khi khởi động server:', { error: error.message });
        process.exit(1);
    }
};

startServer();