'use strict';

const MenuModel = require('./menu.model');
const logger = require('../../shared/logger')

const getLevenshteinDistance = (a, b) => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(null));
    for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;
    for (let i = 1; i <= a.length; i += 1) {
        for (let j = 1; j <= b.length; j += 1) {
            const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i][j - 1] + 1, 
                matrix[i - 1][j] + 1, 
                matrix[i - 1][j - 1] + indicator 
            );
        }
    }
    return matrix[a.length][b.length];
};

const MenuService = {
    getAllItems: () => {
        return MenuModel.getAll();
    },

    findByName: (name) => {
        const normalizedInput = MenuModel.normalizeString(name);
        console.log(normalizedInput);
        const menuMap = MenuModel.getMap();
        
        // 1. Tìm chính xác 100%
        if (menuMap.has(normalizedInput)) {
            return menuMap.get(normalizedInput);
        }

        // 2. Tìm gần đúng (Fuzzy Matching)
        let bestMatch = null;
        let minDistance = 3; 

        for (const [mapName, item] of menuMap.entries()) {
            const distance = getLevenshteinDistance(normalizedInput, mapName);
            if (distance < minDistance) {
                minDistance = distance;
                bestMatch = item;
            }
        }
        return bestMatch;
    },

    getPrice: (itemName, size = 'M') => {
        if (!itemName) throw new Error(`INVALID_ITEM_NAME`);
        const item = MenuService.findByName(itemName);
        
        if (!item) {
            logger.error(`Không tìm thấy món: ${itemName}`);
            throw new Error(`ITEM_NOT_FOUND: ${itemName}`);
        }
        
        const sizeUpper = size.toUpperCase();
        if (sizeUpper === 'L' && item.price_l > 0) return item.price_l;
        
        return item.price_m > 0 ? item.price_m : item.price_l;
    }
};

module.exports = MenuService;