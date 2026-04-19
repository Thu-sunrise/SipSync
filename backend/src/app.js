require('dotenv').config();
const express = require('express');
const cors = require('cors');

const rootRouter = require('./routes/index');
const logger = require('./shared/logger');
const setupSwagger = require('./config/swagger');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// swagger
setupSwagger(app);

// Gắn các routes modular
// Tất cả các route từ index.js sẽ bắt đầu từ root (/)
app.use('/', rootRouter);

// Middleware xử lý lỗi tập trung (Error Handler)
app.use((err, req, res, next) => {
    logger.error('Lỗi hệ thống không xác định:', { error: err.message });
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
});

module.exports = app;