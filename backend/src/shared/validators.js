'use strict';

/**
 * Validator/sanitizer thuần JS (không phụ thuộc thư viện) cho dữ liệu đến từ
 * hệ thống bên ngoài: LLM (OpenAI/Groq) và PayOS. Không bao giờ tin dữ liệu ngoài.
 */

const VALID_INTENTS = ['chat', 'order', 'confirm_order', 'view_menu', 'view_cart', 'cancel'];
const VALID_ACTIONS = ['add', 'update', 'remove'];
const VALID_SIZES = ['M', 'L'];
const MAX_QUANTITY = 50;
const MAX_NOTE_LENGTH = 200;
const MAX_ITEM_NAME_LENGTH = 100;

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Chuẩn hoá & kiểm tra JSON do LLM trả về.
 * - intent không hợp lệ → 'chat'
 * - order_entities: loại bỏ phần tử sai schema, ép size/quantity/action về giá trị an toàn
 *
 * @param {unknown} raw
 * @returns {{intent: string, message: string, order_entities: Array}}
 */
function validateAiResponse(raw) {
  const data = isPlainObject(raw) ? raw : {};

  const intent = VALID_INTENTS.includes(data.intent) ? data.intent : 'chat';
  const message =
    typeof data.message === 'string' && data.message.trim()
      ? data.message
      : 'Dạ bạn đợi mình xíu nhé!';

  const entities = Array.isArray(data.order_entities) ? data.order_entities : [];
  const order_entities = [];

  for (const e of entities) {
    if (!isPlainObject(e)) continue;
    if (typeof e.item_name !== 'string' || !e.item_name.trim()) continue;

    const quantity = Number(e.quantity ?? 1);
    const size = typeof e.size === 'string' ? e.size.trim().toUpperCase() : 'M';

    order_entities.push({
      action: VALID_ACTIONS.includes(e.action) ? e.action : 'add',
      item_name: e.item_name.trim().slice(0, MAX_ITEM_NAME_LENGTH),
      quantity: Number.isInteger(quantity) && quantity >= 1 ? Math.min(quantity, MAX_QUANTITY) : 1,
      size: VALID_SIZES.includes(size) ? size : 'M',
      note: typeof e.note === 'string' ? e.note.slice(0, MAX_NOTE_LENGTH) : '',
    });
  }

  return { intent, message, order_entities };
}

/**
 * Kiểm tra đơn hàng trước khi tạo link thanh toán PayOS.
 * @param {object} order
 * @returns {{valid: boolean, errors: string[]}}
 */
function validatePaymentOrder(order) {
  const errors = [];

  if (!isPlainObject(order)) {
    return { valid: false, errors: ['order phải là object'] };
  }
  if (typeof order.orderId !== 'string' || !order.orderId) {
    errors.push('orderId không hợp lệ');
  }
  if (!Number.isFinite(order.totalAmount) || Math.round(order.totalAmount) <= 0) {
    errors.push('totalAmount phải là số dương');
  }
  if (!Array.isArray(order.items) || order.items.length === 0) {
    errors.push('items không được rỗng');
  } else {
    order.items.forEach((item, i) => {
      if (!isPlainObject(item)) {
        errors.push(`items[${i}] không hợp lệ`);
        return;
      }
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        errors.push(`items[${i}].quantity phải là số nguyên >= 1`);
      }
      if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
        errors.push(`items[${i}].unitPrice không hợp lệ`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Kiểm tra cấu trúc body webhook PayOS (trước và sau khi xác thực chữ ký).
 * @param {unknown} body
 * @returns {{valid: boolean, errors: string[]}}
 */
function validatePayosWebhook(body) {
  const errors = [];

  if (!isPlainObject(body)) {
    return { valid: false, errors: ['body phải là object'] };
  }
  if (typeof body.signature !== 'string' || !body.signature) {
    errors.push('thiếu signature');
  }
  if (!isPlainObject(body.data)) {
    errors.push('thiếu data');
  } else {
    if (!Number.isInteger(Number(body.data.orderCode))) {
      errors.push('data.orderCode phải là số nguyên');
    }
    if (!Number.isFinite(Number(body.data.amount)) || Number(body.data.amount) <= 0) {
      errors.push('data.amount phải là số dương');
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = {
  VALID_INTENTS,
  validateAiResponse,
  validatePaymentOrder,
  validatePayosWebhook,
};
