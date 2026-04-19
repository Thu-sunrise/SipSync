'use strict';

const jwt = require('jsonwebtoken');

const AuthService = {
    /**
     * Xác thực mật khẩu admin và tạo JWT
     */
    login: async (password) => {
        if (password !== process.env.ADMIN_PASSWORD) {
            throw new Error('INVALID_PASSWORD');
        }

        // Tạo JWT Token có thời hạn 24h
        const token = jwt.sign(
            { role: 'admin' }, 
            process.env.JWT_SECRET, 
            { expiresIn: '24h' }
        );

        return token;
    }
};

module.exports = AuthService;
