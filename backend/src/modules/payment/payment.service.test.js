const mockPayosCreate = jest.fn();

jest.mock('@payos/node', () => ({
    PayOS: jest.fn().mockImplementation(() => ({
        paymentRequests: { create: mockPayosCreate },
    })),
}));
jest.mock('./payment.model', () => ({
    Payment: { create: jest.fn(), findOne: jest.fn() },
}));
jest.mock('../order/order.model', () => ({
    Order: { findOne: jest.fn() },
    OrderStatusLog: { create: jest.fn() },
}));
jest.mock('../bot/bot.service', () => ({ sendMessage: jest.fn() }));
jest.mock('../../shared/logger', () => ({
    info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(),
}));

const PaymentService = require('./payment.service');
const { Payment } = require('./payment.model');
const { Order, OrderStatusLog } = require('../order/order.model');
const BotService = require('../bot/bot.service');

describe('PaymentService (luồng đầy đủ)', () => {
    beforeEach(() => {
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });
    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    test('createPaymentLink: gọi PayOS với dữ liệu đã chuẩn hoá và lưu Payment', async () => {
        mockPayosCreate.mockResolvedValue({
            paymentLinkId: 'pl1', qrCode: 'QR', checkoutUrl: 'https://pay/x',
        });
        Payment.create.mockImplementation(async (d) => d);

        const order = {
            orderId: 'DH_1',
            totalAmount: 80000.4,
            items: [{ name: 'Trà Sữa Đường Đen Trân Châu Siêu Dài', size: 'L', quantity: 2, unitPrice: 40000 }],
        };
        const r = await PaymentService.createPaymentLink(order);

        const sent = mockPayosCreate.mock.calls[0][0];
        expect(Number.isInteger(sent.orderCode)).toBe(true);
        expect(sent.amount).toBe(80000);
        expect(sent.description.length).toBeLessThanOrEqual(25);
        expect(sent.items[0].name.length).toBeLessThanOrEqual(25);
        expect(Payment.create).toHaveBeenCalledWith(
            expect.objectContaining({ orderId: 'DH_1', status: 'PENDING', qrCode: 'QR' })
        );
        expect(r.checkoutUrl).toBe('https://pay/x');
    });

    test('createPaymentLink: lỗi PayOS được ném lên và không lưu DB', async () => {
        mockPayosCreate.mockRejectedValue(new Error('PAYOS_DOWN'));
        await expect(PaymentService.createPaymentLink({
            orderId: 'DH_2', totalAmount: 10000,
            items: [{ name: 'A', size: 'M', quantity: 1, unitPrice: 10000 }],
        })).rejects.toThrow('PAYOS_DOWN');
        expect(Payment.create).not.toHaveBeenCalled();
    });

    test('handleWebhook: thanh toán thành công → payment SUCCESS, đơn QUEUED, gửi Telegram', async () => {
        const payment = { orderId: 'DH_1', amount: 80000, save: jest.fn() };
        const order = { orderId: 'DH_1', status: 'PENDING_PAYMENT', telegramUserId: 't1', save: jest.fn() };
        Payment.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(payment);
        Order.findOne.mockResolvedValue(order);

        const r = await PaymentService.handleWebhook({
            code: '00',
            data: { orderCode: 123, amount: 80000, reference: 'REF1' },
        });

        expect(r).toEqual({ orderId: 'DH_1', newStatus: 'QUEUED' });
        expect(payment.status).toBe('SUCCESS');
        expect(payment.webhookEventId).toBe('REF1');
        expect(order.status).toBe('QUEUED');
        expect(OrderStatusLog.create).toHaveBeenCalledWith(
            expect.objectContaining({ oldStatus: 'PENDING_PAYMENT', newStatus: 'QUEUED', changedBy: 'webhook' })
        );
        expect(BotService.sendMessage).toHaveBeenCalledWith('t1', expect.any(String));
    });

    test('handleWebhook: không tìm thấy payment → bỏ qua', async () => {
        Payment.findOne.mockResolvedValue(null);
        const r = await PaymentService.handleWebhook({
            code: '00', data: { orderCode: 9, amount: 1000, reference: 'R' },
        });
        expect(r).toBeUndefined();
        expect(Order.findOne).not.toHaveBeenCalled();
    });
});
