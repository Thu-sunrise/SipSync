'use strict';

const BotService = require('./bot.service');
const AiService = require('../ai/ai.service');
const CartService = require('../cart/cart.service');
const OrderService = require('../order/order.service');
const logger = require('../../shared/logger');

const BotController = {
    /**
     * Nhận webhook từ Telegram và xử lý tin nhắn của khách hàng.
     */
    handleWebhook: async (req, res) => {
        // 0. Xác thực Secret Token từ Telegram (Bảo mật)
        const secretToken = req.headers['x-telegram-bot-api-secret-token'];
        if (secretToken !== process.env.TELEGRAM_WEBHOOK_TOKEN) {
            logger.warn('Cảnh báo: Có yêu cầu không hợp lệ gửi đến Webhook Telegram (Sai Secret Token)');
            return res.sendStatus(403);
        }

        const { message } = req.body;
        
        if (!message || !message.text) {
            return res.sendStatus(200);
        }

        const telegramUserId = message.from.id.toString();
        const chatId = message.chat.id;
        const userText = message.text;
        const customerName = `${message.from.first_name || ''} ${message.from.last_name || ''}`.trim();
        const updateId = req.body.update_id;

        try {
            // Kiểm tra trùng lặp tin nhắn (Idempotency)
            if (updateId) {
                const redisClient = require('../../shared/redis').getRedisClient();
                const lockKey = `bot:update:${updateId}`;
                const isProcessed = await redisClient.get(lockKey);
                if (isProcessed) {
                    logger.warn({ updateId }, 'Phát hiện tin nhắn trùng lặp từ Telegram, bỏ qua.');
                    return res.sendStatus(200);
                }
                // Lưu lại updateId này trong 10 phút để chặn trùng
                await redisClient.set(lockKey, 'processed', 'EX', 600);
            }
            // 1. Kiểm tra Rate Limit (20 msg/phút)
            const rateLimit = await CartService.checkRateLimit(telegramUserId);
            if (!rateLimit.allowed) {
                await BotService.sendMessage(chatId, 'Dạ bạn nhắn nhanh quá cô chủ quán load không kịp ạ! Bạn đợi xíu rồi nhắn tiếp nhé. 🙏');
                return res.sendStatus(200);
            }

            // 2. Lấy lịch sử hội thoại để AI có ngữ cảnh
            const history = await CartService.getHistory(telegramUserId);

            // 3. Gọi AI để phân tích intent và trích xuất món ăn
            const aiResult = await AiService.processMessage(userText, history);
            const { intent, message: botResponse, order_entities } = aiResult;

            logger.info({ telegramUserId, intent, entities: order_entities?.length }, 'AI Result');

            // 4. Lưu lịch sử (Cả của user và bot)
            await CartService.appendHistory(telegramUserId, { role: 'user', content: userText });
            await CartService.appendHistory(telegramUserId, { role: 'assistant', content: botResponse });

            // 5. LUÔN LUÔN THÊM MÓN VÀO GIỎ TRƯỚC (Nếu AI trích xuất được)
            // Điều này đảm bảo nếu khách nói "Cho 1 trà sữa và thanh toán luôn" thì món vẫn được lưu
            if (order_entities && order_entities.length > 0) {
                logger.info({ order_entities }, '>>> DỮ LIỆU MÓN AI TRÍCH XUẤT');
                for (const entity of order_entities) {
                    const itemName = entity.item_name || entity.name || entity.item;
                    const action = entity.action || 'add';

                    if (itemName) {
                        const parsedItem = {
                            name: itemName,
                            quantity: entity.quantity || 1,
                            size: entity.size || 'M',
                            note: entity.note || ''
                        };

                        if (action === 'update') {
                            await CartService.updateItem(telegramUserId, parsedItem);
                        } else if (action === 'remove') {
                            await CartService.removeItem(telegramUserId, itemName);
                        } else {
                            await CartService.addItem(telegramUserId, parsedItem);
                        }
                    }
                }
            }

            // 6. Xử lý dựa trên Intent
            switch (intent) {
                case 'order':
                    const ctaSuffix = '\n\nBạn muốn chốt đơn luôn không ạ? Nhắn "<b>Chốt đơn</b>" giúp mình nhé! ✨';
                    await BotService.sendMessage(chatId, botResponse + ctaSuffix);
                    break;

                case 'view_cart':
                    const cart = await CartService.getCart(telegramUserId);
                    if (cart.length === 0) {
                        await BotService.sendMessage(chatId, 'Dạ giỏ hàng của bạn đang trống không ạ. Bạn muốn uống món gì thì cứ bảo mình nha! 🧋');
                    } else {
                        let cartText = '<b>Giỏ hàng của bạn đây ạ:</b>\n\n';
                        cart.forEach((item, index) => {
                            cartText += `${index + 1}. ${item.name} (${item.size}) x ${item.quantity}\n`;
                            if (item.note) cartText += `   <i>Ghi chú: ${item.note}</i>\n`;
                        });
                        cartText += '\nBạn muốn chốt đơn luôn không ạ? Nhắn "<b>Chốt đơn</b>" giúp mình nhé!';
                        await BotService.sendMessage(chatId, cartText);
                    }
                    break;

                case 'confirm_order':
                    try {
                        // 8. Chốt đơn & Xóa giỏ hàng + Lịch sử chat
                        const { order, payment } = await OrderService.checkout(telegramUserId, customerName);
                        await CartService.clearCart(telegramUserId);
                        await CartService.clearHistory(telegramUserId);

                        // Kết hợp lời nhắn của AI và yêu cầu xác nhận thanh toán của hệ thống
                        let confirmText = `${botResponse}\n\n`;
                        confirmText += `----------------------------\n`;
                        confirmText += `Mã đơn: <code>${order.orderId}</code>\n`;
                        confirmText += `Tổng tiền: <b>${order.totalAmount.toLocaleString()}đ</b>\n\n`;
                        confirmText += `<i>Bạn vui lòng xác nhận thanh toán bằng cách quét mã QR bên dưới hoặc bấm vào link này nha:</i>\n`;
                        confirmText += `<a href="${payment.checkoutUrl}">👉 Link thanh toán PayOS</a>\n\n`;
                        confirmText += `Mình sẽ báo ngay cho bếp khi nhận được tiền ạ! ❤️`;

                        try {
                            if (payment.qrCode) {
                                // Chuyển chuỗi VietQR thành link ảnh QR để Telegram có thể hiển thị
                                const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(payment.qrCode)}&size=300x300`;
                                await BotService.sendPhoto(chatId, qrImageUrl, confirmText);
                            } else {
                                await BotService.sendMessage(chatId, confirmText);
                            }
                        } catch (photoError) {
                            logger.warn({ err: photoError.message }, 'Không gửi được ảnh QR, gửi text fallback');
                            await BotService.sendMessage(chatId, confirmText);
                        }
                    } catch (err) {
                        if (err.message === 'CART_EMPTY') {
                            await BotService.sendMessage(chatId, 'Dạ giỏ hàng trống thì mình chưa chốt đơn được ạ. Bạn chọn món trước nhé!');
                        } else {
                            throw err;
                        }
                    }
                    break;

                case 'cancel':
                    await CartService.clearCart(telegramUserId);
                    await BotService.sendMessage(chatId, 'Dạ mình đã xóa giỏ hàng rồi ạ. Khi nào bạn muốn đặt lại thì cứ gọi mình nha! 👋');
                    break;

                case 'view_menu':
                    const menuItems = require('../menu/menu.service').getAllItems();
                    let menuText = '<b>Thực đơn của quán mình đây ạ:</b>\n\n';
                    
                    // Nhóm theo category
                    const categories = [...new Set(menuItems.map(i => i.category))];
                    categories.forEach(cat => {
                        menuText += `--- <b>${cat}</b> ---\n`;
                        menuItems.filter(i => i.category === cat).forEach(item => {
                            menuText += `• ${item.name}: <code>${item.price_m.toLocaleString()}đ</code> (M) | <code>${item.price_l.toLocaleString()}đ</code> (L)\n`;
                        });
                        menuText += '\n';
                    });
                    
                    menuText += '<i>Bạn muốn uống món nào thì cứ bảo mình nha!</i>';
                    await BotService.sendMessage(chatId, menuText);
                    break;

                default:
                    // Intent chat bình thường
                    await BotService.sendMessage(chatId, botResponse);
                    break;
            }

            res.sendStatus(200);
        } catch (error) {
            logger.error({ err: error, telegramUserId }, 'Lỗi xử lý webhook Telegram');
            // Thông báo lỗi nhẹ nhàng cho khách
            await BotService.sendMessage(chatId, 'Dạ xin lỗi bạn, hệ thống của mình đang gặp chút trục trặc nhỏ. Bạn thử lại sau ít phút nha!');
            res.sendStatus(200); 
        }
    }
};

module.exports = BotController;
