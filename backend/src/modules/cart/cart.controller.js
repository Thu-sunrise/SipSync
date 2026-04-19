const CartService = require('./cart.service'); // Đã cập nhật tên file
const logger = require('../../shared/logger');

const CartController = {
    // [GET] /cart/:userId
    getCart: async (req, res) => {
        try {
            const { userId } = req.params;
            const cart = await CartService.getCart(userId);
            res.status(200).json({ status: 'success', data: cart });
        } catch (error) {
            res.status(500).json({ status: 'error', message: 'Lỗi khi lấy giỏ hàng' });
        }
    },

    // [POST] /cart/:userId/items
    addItem: async (req, res) => {
        try {
            const { userId } = req.params;
            const item = req.body; 
            
            // Validate cơ bản để tránh rác dữ liệu
            if (!item.name || !item.quantity || !item.unitPrice) {
                return res.status(400).json({ status: 'error', message: 'Thiếu thông tin món ăn' });
            }

            const updatedCart = await CartService.addItem(userId, item);
            res.status(200).json({ status: 'success', data: updatedCart });
        } catch (error) {
            res.status(500).json({ status: 'error', message: 'Lỗi khi thêm món vào giỏ' });
        }
    },

    // [DELETE] /cart/:userId
    clearCart: async (req, res) => {
        try {
            const { userId } = req.params;
            await CartService.clearCart(userId);
            res.status(200).json({ status: 'success', message: 'Đã xóa giỏ hàng' });
        } catch (error) {
            res.status(500).json({ status: 'error', message: 'Lỗi khi xóa giỏ hàng' });
        }
    }
};

module.exports = CartController;