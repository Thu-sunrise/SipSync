'use strict';

const AiService = require('./ai.service');
const MenuService = require('../menu/menu.service');
const CartService = require('../cart/cart.service');
const logger = require('../../shared/logger');
const { Console } = require('winston/lib/winston/transports');

const AiController = {
    handleChat : async (req, res) => {
        try {
            const { telegramUserId, message } = req.body;

            if (!telegramUserId || !message) {
                return res.status(400).json({ status: 'error', message: 'Thiếu telegramUserId hoặc message' });
            }

            logger.info({ telegramUserId, message }, 'Nhận tin nhắn mới, đang gửi cho AI xử lý...');

            // 1. Nhờ AI bóc tách tin nhắn thành mảng các món
            const extractedItems = await AiService.extractOrderItems(message);
            console.log(extractedItems);
           
            if (extractedItems.length === 0) {
                return res.status(200).json({ 
                    status: 'success', 
                    message: 'Bot không tìm thấy món ăn nào trong câu của bạn.',
                    data: await CartService.getCart(telegramUserId) // Trả về giỏ hàng hiện tại
                });
            }

            // 2. Kiểm tra tên món xem có thực sự tồn tại trong Menu không (Fuzzy Match)
            // Nếu có, lấy tên chuẩn và đưa vào Giỏ hàng Redis
            for (let item of extractedItems) {
                const matchedItem = MenuService.findByName(item.name);
                console.log(matchedItem);
                
                if (matchedItem) {
                    // Cập nhật lại tên chuẩn và giá chuẩn trước khi cho vào giỏ
                    item.name = matchedItem.name;
                    item.unitPrice = MenuService.getPrice(matchedItem.name, item.size);
                    
                    await CartService.addItem(telegramUserId, item);
                } else {
                    logger.warn({ itemName: item.name }, 'AI bóc tách được nhưng không có trong Menu');
                }
            }

            // 3. Lấy Giỏ hàng mới nhất để trả về cho người dùng xem
            const updatedCart = await CartService.getCart(telegramUserId);
            let totalAmount = 0;
            for (let item of updatedCart){
                totalAmount += item.quantity;
            }

            res.status(200).json({ 
                status: 'success', 
                message: `Đã thêm ${totalAmount} món vào giỏ hàng!`,
                data: updatedCart 
            });

        } catch (error) {
            res.status(500).json({ status: 'error', message: 'Lỗi xử lý AI' });
            console.log(error);
        }
    }
}

module.exports = AiController