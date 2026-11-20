'use strict';

jest.mock('@payos/node', () => ({
  PayOS: jest.fn().mockImplementation(() => ({
    paymentRequests: { create: jest.fn() },
  })),
}));
jest.mock('../src/modules/payment/payment.model', () => ({
  Payment: { create: jest.fn(), findOne: jest.fn() },
}));
jest.mock('../src/modules/order/order.model', () => ({
  Order: { findOne: jest.fn() },
  OrderStatusLog: { create: jest.fn() },
}));
jest.mock('../src/modules/bot/bot.service', () => ({ sendMessage: jest.fn() }));

const crypto = require('crypto');
const { Payment } = require('../src/modules/payment/payment.model');
const PaymentService = require('../src/modules/payment/payment.service');

const SECRET = 'test-checksum-key';
const sign = (data) => {
  const qs = Object.keys(data).sort().map((k) => `${k}=${data[k]}`).join('&');
  return crypto.createHmac('sha256', SECRET).update(qs).digest('hex');
};

beforeAll(() => {
  process.env.PAYOS_CHECKSUM_KEY = SECRET;
  jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
});
afterAll(() => jest.restoreAllMocks());
beforeEach(() => jest.clearAllMocks());

describe('PaymentService.verifyWebhookData', () => {
  const data = { orderCode: 123, amount: 3000, reference: 'REF1' };

  test('chữ ký đúng → trả về data', () => {
    expect(PaymentService.verifyWebhookData({ data, signature: sign(data) })).toEqual(data);
  });

  test('chữ ký sai hoặc data bị sửa → null', () => {
    expect(PaymentService.verifyWebhookData({ data, signature: 'sai' })).toBeNull();
    const sig = sign(data);
    expect(
      PaymentService.verifyWebhookData({ data: { ...data, amount: 1 }, signature: sig })
    ).toBeNull();
  });

  test('thiếu data/signature/body → null', () => {
    expect(PaymentService.verifyWebhookData({ data })).toBeNull();
    expect(PaymentService.verifyWebhookData({ signature: 'x' })).toBeNull();
    expect(PaymentService.verifyWebhookData(undefined)).toBeNull();
  });
});

describe('PaymentService.createPaymentLink', () => {
  test('từ chối đơn không hợp lệ, không gọi PayOS/DB', async () => {
    await expect(
      PaymentService.createPaymentLink({ orderId: 'O1', totalAmount: 0, items: [] })
    ).rejects.toThrow('INVALID_PAYMENT_ORDER');
    expect(Payment.create).not.toHaveBeenCalled();
  });
});

describe('PaymentService.handleWebhook', () => {
  test('code != 00 → bỏ qua', async () => {
    await PaymentService.handleWebhook({ code: '01', data: { orderCode: 1 } });
    expect(Payment.findOne).not.toHaveBeenCalled();
  });

  test('payload sai schema → bỏ qua', async () => {
    await PaymentService.handleWebhook({ code: '00', data: { orderCode: 'abc', amount: 1 } });
    expect(Payment.findOne).not.toHaveBeenCalled();
  });

  test('số tiền không khớp → không cập nhật payment', async () => {
    const payment = { amount: 50000, save: jest.fn() };
    Payment.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(payment);
    const r = await PaymentService.handleWebhook({
      code: '00',
      data: { orderCode: 1, amount: 1000, reference: 'R' },
    });
    expect(r).toBeUndefined();
    expect(payment.save).not.toHaveBeenCalled();
  });

  test('webhook trùng (idempotent) → bỏ qua', async () => {
    Payment.findOne.mockResolvedValueOnce({ id: 'x' });
    const r = await PaymentService.handleWebhook({
      code: '00',
      data: { orderCode: 1, amount: 1000, reference: 'R' },
    });
    expect(r).toBeUndefined();
    expect(Payment.findOne).toHaveBeenCalledTimes(1);
  });
});
