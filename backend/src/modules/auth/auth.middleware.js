'use strict';

const jwt = require('jsonwebtoken');

/**
 * Middleware xác thực JWT cho các API Admin
 */
const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ status: 'error', message: 'Bạn cần đăng nhập để thực hiện thao tác này' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Gắn thông tin admin vào request (nếu cần dùng sau này)
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ status: 'error', message: 'Token không hợp lệ hoặc đã hết hạn' });
    }
};

module.exports = authMiddleware;
