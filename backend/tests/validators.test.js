'use strict';

const {
  validateAiResponse,
  validatePaymentOrder,
  validatePayosWebhook,
} = require('../src/shared/validators');

describe('validateAiResponse', () => {
  test('input không phải object → fallback an toàn', () => {
    for (const bad of [null, undefined, 'x', 42, []]) {
      const r = validateAiResponse(bad);
      expect(r.intent).toBe('chat');
      expect(r.order_entities).toEqual([]);
      expect(typeof r.message).toBe('string');
    }
  });

  test('intent lạ bị đưa về chat', () => {
    expect(validateAiResponse({ intent: 'hack', message: 'a' }).intent).toBe('chat');
  });

  test('giữ nguyên dữ liệu hợp lệ', () => {
    const r = validateAiResponse({
      intent: 'order',
      message: 'ok',
      order_entities: [{ action: 'add', item_name: 'Trà sữa', quantity: 2, size: 'L', note: 'ít đá' }],
    });
    expect(r.intent).toBe('order');
    expect(r.order_entities).toEqual([
      { action: 'add', item_name: 'Trà sữa', quantity: 2, size: 'L', note: 'ít đá' },
    ]);
  });

  test('ép size/quantity/action về giá trị an toàn và bỏ entity sai schema', () => {
    const r = validateAiResponse({
      intent: 'order',
      order_entities: [
        { action: 'drop', item_name: 'A', quantity: -3, size: 'xl' },
        { action: 'add', item_name: 'B', quantity: 9999, size: 'l' },
        { action: 'add', item_name: '   ' },
        { action: 'add' },
        'rác',
      ],
    });
    expect(r.order_entities).toHaveLength(2);
    expect(r.order_entities[0]).toMatchObject({ action: 'add', quantity: 1, size: 'M' });
    expect(r.order_entities[1]).toMatchObject({ quantity: 50, size: 'L' });
  });

  test('order_entities không phải mảng → []', () => {
    expect(validateAiResponse({ order_entities: 'x' }).order_entities).toEqual([]);
  });
});

describe('validatePaymentOrder', () => {
  const good = {
    orderId: 'ORD-1',
    totalAmount: 50000,
    items: [{ name: 'Trà sữa', size: 'M', quantity: 1, unitPrice: 50000 }],
  };

  test('đơn hợp lệ', () => {
    expect(validatePaymentOrder(good)).toEqual({ valid: true, errors: [] });
  });

  test('từ chối đơn sai dữ liệu', () => {
    expect(validatePaymentOrder(null).valid).toBe(false);
    expect(validatePaymentOrder({ ...good, totalAmount: 0 }).valid).toBe(false);
    expect(validatePaymentOrder({ ...good, orderId: '' }).valid).toBe(false);
    expect(validatePaymentOrder({ ...good, items: [] }).valid).toBe(false);
    expect(
      validatePaymentOrder({ ...good, items: [{ quantity: 1.5, unitPrice: 10 }] }).valid
    ).toBe(false);
  });
});

describe('validatePayosWebhook', () => {
  const good = { signature: 'abc', data: { orderCode: 123, amount: 3000 } };

  test('payload hợp lệ', () => {
    expect(validatePayosWebhook(good).valid).toBe(true);
  });

  test('từ chối payload thiếu/sai kiểu', () => {
    expect(validatePayosWebhook(null).valid).toBe(false);
    expect(validatePayosWebhook({ data: good.data }).valid).toBe(false);
    expect(validatePayosWebhook({ signature: 's' }).valid).toBe(false);
    expect(validatePayosWebhook({ signature: 's', data: { orderCode: 'x', amount: 1 } }).valid).toBe(false);
    expect(validatePayosWebhook({ signature: 's', data: { orderCode: 1, amount: -5 } }).valid).toBe(false);
  });
});
