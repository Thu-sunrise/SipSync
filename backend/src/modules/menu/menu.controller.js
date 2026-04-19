'use strict';

const MenuService = require('./menu.service');

const MenuController = {
    getAll: (req, res) => {
        try {
            const items = MenuService.getAllItems();
            res.status(200).json({ status: 'success', data: items });
        } catch (error) {
            res.status(500).json({ status: 'error', message: 'Lỗi server' });
        }
    },

    search: (req, res) => {
        try {
            const { q } = req.query; // ?q=tra sua
            if (!q) return res.status(400).json({ status: 'error', message: 'Vui lòng cung cấp từ khóa' });
            
            const item = MenuService.findByName(q);
            if (!item) return res.status(404).json({ status: 'error', message: 'Không tìm thấy món' });
            
            res.status(200).json({ status: 'success', data: item });
        } catch (error) {
            res.status(500).json({ status: 'error', message: 'Lỗi server' });
        }
    }
};

module.exports = MenuController;