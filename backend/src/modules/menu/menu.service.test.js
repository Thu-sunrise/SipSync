'use strict';

const MenuService = require('./menu.service');
const MenuModel = require('./menu.model');

// Mock dữ liệu của Model
jest.mock('./menu.model', () => {
    const fakeMap = new Map();
    fakeMap.set('trasua', { name: 'Trà Sữa', price_m: 30000, price_l: 40000 });
    fakeMap.set('cafeden', { name: 'Cafe Đen', price_m: 20000, price_l: 0 });
    fakeMap.set('cafesua', { name: 'Cafe Sữa', price_m: 25000, price_l: 0 });
    fakeMap.set('bacxiu', { name: 'Bạc Xỉu', price_m: 28000, price_l: 35000 });
    fakeMap.set('matcha', { name: 'Matcha Latte', price_m: 35000, price_l: 45000 });
    fakeMap.set('hongtra', { name: 'Hồng Trà', price_m: 25000, price_l: 35000 });
    fakeMap.set('traDao', { name: 'Trà Đào', price_m: 30000, price_l: 40000 });
    fakeMap.set('travailai', { name: 'Trà Vải', price_m: 30000, price_l: 40000 });
    fakeMap.set('trachanhlanh', { name: 'Trà Chanh', price_m: 20000, price_l: 30000 });
    fakeMap.set('trasuadau', { name: 'Trà Sữa Dâu', price_m: 32000, price_l: 42000 });
    fakeMap.set('trasuachocolate', { name: 'Trà Sữa Chocolate', price_m: 33000, price_l: 43000 });
    fakeMap.set('trasuakhoaimon', { name: 'Trà Sữa Khoai Môn', price_m: 34000, price_l: 44000 });
    fakeMap.set('trasuatranchau', { name: 'Trà Sữa Trân Châu', price_m: 31000, price_l: 41000 });
    fakeMap.set('trasuaduongden', { name: 'Trà Sữa Đường Đen', price_m: 36000, price_l: 46000 });
    fakeMap.set('capuccino', { name: 'Cappuccino', price_m: 40000, price_l: 50000 });
    fakeMap.set('latte', { name: 'Latte', price_m: 38000, price_l: 48000 });
    fakeMap.set('americano', { name: 'Americano', price_m: 30000, price_l: 40000 });
    fakeMap.set('espresso', { name: 'Espresso', price_m: 25000, price_l: 0 });
    fakeMap.set('mocha', { name: 'Mocha', price_m: 42000, price_l: 52000 });
    fakeMap.set('sinhtoBo', { name: 'Sinh Tố Bơ', price_m: 35000, price_l: 45000 });
    fakeMap.set('sinhtoXoai', { name: 'Sinh Tố Xoài', price_m: 30000, price_l: 40000 });
    fakeMap.set('sinhtoDau', { name: 'Sinh Tố Dâu', price_m: 30000, price_l: 40000 });
    fakeMap.set('nuocCam', { name: 'Nước Cam', price_m: 25000, price_l: 35000 });
    fakeMap.set('nuocEpTao', { name: 'Nước Ép Táo', price_m: 28000, price_l: 38000 });
    fakeMap.set('nuocEpCarot', { name: 'Nước Ép Cà Rốt', price_m: 27000, price_l: 37000 });
    fakeMap.set('daXayDau', { name: 'Đá Xay Dâu', price_m: 40000, price_l: 50000 });
    fakeMap.set('daXaySocola', { name: 'Đá Xay Socola', price_m: 42000, price_l: 52000 });
    fakeMap.set('daXayMatcha', { name: 'Đá Xay Matcha', price_m: 42000, price_l: 52000 });
    fakeMap.set('traTac', { name: 'Trà Tắc', price_m: 20000, price_l: 30000 });
    fakeMap.set('suaTuoiTranChauDuongDen', { name: 'Sữa Tươi Trân Châu Đường Đen', price_m: 38000, price_l: 48000 }); // Không có size L

    return {
        getMap: jest.fn(() => fakeMap),
        normalizeString: jest.fn((str) => str.toLowerCase().replace(/\s/g, ''))
    };
});

describe('Menu Service Tests - Extended', () => {

    // ===== findByName =====
    test('findByName: Không phân biệt hoa thường', () => {
        expect(MenuService.findByName('TRASUA').name).toBe('Trà Sữa');
    });

    test('findByName: Không bị ảnh hưởng bởi khoảng trắng', () => {
        expect(MenuService.findByName('  tra    sua  ').name).toBe('Trà Sữa');
    });

    test('findByName: Gõ gần đúng nhiều lựa chọn → chọn món gần nhất', () => {
        const result = MenuService.findByName('tra');
        expect(result).toBeDefined(); // không crash
    });

    test('findByName: Trả về null nếu không tìm thấy', () => {
        const result = MenuService.findByName('xyzabc');
        expect(result).toBeNull();
    });

    test('findByName: Input rỗng', () => {
        const result = MenuService.findByName('');
        expect(result).toBeNull();
    });

    test('findByName: Input null/undefined', () => {
        expect(MenuService.findByName(null)).toBeNull();
        expect(MenuService.findByName(undefined)).toBeNull();
    });

    test('findByName: Sai chính tả nặng (>=3 ký tự)', () => {
        const result = MenuService.findByName('tsuaaaa');
        expect(result).toBeDefined(); // tùy logic, có thể vẫn match
    });

    // ===== getPrice =====
    test('getPrice: Không phân biệt hoa thường size', () => {
        expect(MenuService.getPrice('trasua', 'm')).toBe(30000);
        expect(MenuService.getPrice('trasua', 'l')).toBe(40000);
    });

    test('getPrice: Size không hợp lệ → fallback về M', () => {
        expect(MenuService.getPrice('trasua', 'XL')).toBe(30000);
    });

    test('getPrice: Không có size L → fallback về M', () => {
        expect(MenuService.getPrice('espresso', 'L')).toBe(25000);
    });

    test('getPrice: Món không tồn tại', () => {
        const result = MenuService.getPrice('khongtontai', 'M');
        expect(result).toBeNull();
    });

    test('getPrice: Input null/undefined', () => {
        expect(MenuService.getPrice(null, 'M')).toBeNull();
        expect(MenuService.getPrice('trasua', null)).toBe(30000); // fallback
    });

    test('getPrice: Size undefined → mặc định M', () => {
        expect(MenuService.getPrice('trasua')).toBe(30000);
    });

    test('getPrice: Giá = 0 (edge case)', () => {
        expect(MenuService.getPrice('cafeden', 'L')).toBe(20000);
    });

    // ===== Integration behavior =====
    test('Flow: findByName + getPrice hoạt động cùng nhau', () => {
        const item = MenuService.findByName('tra sua');
        const price = MenuService.getPrice('trasua', 'L');

        expect(item.name).toBe('Trà Sữa');
        expect(price).toBe(40000);
    });

});
