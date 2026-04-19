'use strict';

const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const logger = require('../../shared/logger');

const CSV_PATH = path.join(__dirname, '../../../data/Menu.csv');
let menuMap = new Map();

// Hàm chuẩn hóa chuỗi dùng làm Key cho Map
const normalizeString = (str) => {
    if (!str) return '';
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
};

const MenuModel = {
    reload: async () => {
        try {
            if (!fs.existsSync(CSV_PATH)) {
                throw new Error(`Không tìm thấy file Menu tại ${CSV_PATH}`);
            }

            const fileContent = fs.readFileSync(CSV_PATH, 'utf-8');
            const lines = fileContent.split('\n').filter(line => line.trim() !== '');
            const newMenuMap = new Map();
            
            for (let i = 1; i < lines.length; i++) {
                const [category,item_id,name,description,price_m,price_l,available] = lines[i].split(',');
                
                if (name && available?.trim() !== 'false' && available?.trim() !== '0') {
                    const cleanName = name.trim();
                    newMenuMap.set(normalizeString(cleanName), {
                        item_id: item_id?.trim(),
                        name: cleanName,
                        price_m: parseInt(price_m) || 0,
                        price_l: parseInt(price_l) || 0,
                        description: description?.trim(),
                        category: category?.trim()
                    });
                }
            }

            menuMap = newMenuMap;
            logger.info({ size: menuMap.size }, 'MenuModel: Đã nạp Menu thành công');
        } catch (error) {
            logger.error({ err: error }, 'MenuModel: Lỗi khi nạp file CSV');
            throw error;
        }
    },

    getAll: () => Array.from(menuMap.values()),
    getMap: () => menuMap,
    normalizeString // Xuất ra để Service dùng lại
};

// Hot-reload
chokidar.watch(CSV_PATH, { persistent: true }).on('change', () => {
    logger.info('MenuModel: Phát hiện thay đổi CSV, đang nạp lại...');
    MenuModel.reload().catch(err => logger.error({ err }, 'Lỗi hot-reload Menu'));
});

module.exports = MenuModel;