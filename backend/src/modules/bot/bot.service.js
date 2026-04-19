'use strict';

const axios = require('axios');
const logger = require('../../shared/logger');

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

/**
 * Tiện ích hỗ trợ retry với exponential backoff.
 * @param {Function} fn - Hàm cần thực hiện (trả về Promise)
 * @param {number} retries - Số lần thử lại tối đa
 * @param {number} delay - Độ trễ ban đầu (ms)
 */
const retry = async (fn, retries = 3, delay = 1000) => {
    try {
        return await fn();
    } catch (error) {
        if (retries <= 0) throw error;
        logger.warn(`Retrying in ${delay}ms... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return retry(fn, retries - 1, delay * 2); // Exponential backoff
    }
};

const BotService = {
    /**
     * Gửi tin nhắn văn bản đến khách hàng qua Telegram.
     */
    sendMessage: async (chatId, text, options = {}) => {
        const url = `${TELEGRAM_API}/sendMessage`;
        const payload = {
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
            ...options
        };

        try {
            return await retry(() => axios.post(url, payload));
        } catch (error) {
            logger.error({ err: error, chatId }, 'Lỗi gửi tin nhắn Telegram');
            throw error;
        }
    },

    /**
     * Gửi ảnh (thường là mã QR) đến khách hàng.
     */
    sendPhoto: async (chatId, photoUrl, caption, options = {}) => {
        const url = `${TELEGRAM_API}/sendPhoto`;
        const payload = {
            chat_id: chatId,
            photo: photoUrl,
            caption,
            parse_mode: 'HTML',
            ...options
        };

        try {
            return await retry(() => axios.post(url, payload));
        } catch (error) {
            const telegramError = error.response?.data?.description || error.message;
            logger.error({ err: telegramError, chatId }, 'Lỗi gửi ảnh Telegram');
            throw new Error(`TELEGRAM_SEND_PHOTO_FAILED: ${telegramError}`);
        }
    }
};

module.exports = BotService;
