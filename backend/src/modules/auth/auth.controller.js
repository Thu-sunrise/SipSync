const AuthService = require('./auth.service');
const logger = require('../../shared/logger');

const AuthController = {
    login: async (req, res) => {
        try {
            const { password } = req.body;

            const token = await AuthService.login(password);

            logger.info('Admin đã đăng nhập thành công');
            res.status(200).json({ status: 'success', token });
        } catch (error) {
            if (error.message === 'INVALID_PASSWORD') {
                return res.status(401).json({ status: 'error', message: 'Mật khẩu không chính xác' });
            }
            logger.error({ err: error.message }, 'Lỗi đăng nhập');
            res.status(500).json({ status: 'error', message: 'Internal Server Error' });
        }
    }
};

module.exports = AuthController;
