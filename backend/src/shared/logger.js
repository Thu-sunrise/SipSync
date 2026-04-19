'use strict';

// Số càng nhỏ = càng ít quan trọng. Chỉ log khi level >= LOG_LEVEL hiện tại.
const LEVELS = {
  debug: 0,
  info:  1,
  warn:  2,
  error: 3,
};

// Đọc LOG_LEVEL từ env, fallback về 'info' nếu không set hoặc không hợp lệ
const configuredLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();
const activeLevel = LEVELS[configuredLevel] !== undefined
  ? LEVELS[configuredLevel]
  : LEVELS.info;

// Core log function 
function log(level, meta, msg) {
  // Bỏ qua nếu level thấp hơn mức cấu hình
  if (LEVELS[level] < activeLevel) return;

  // Xử lý overload: log(level, msg) hoặc log(level, meta, msg)
  let message = msg;
  let metadata = meta;
  if (typeof meta === 'string') {
    message = meta;
    metadata = {};
  }

  // Serialize Error object thành dạng readable
  if (metadata && metadata.err instanceof Error) {
    metadata = {
      ...metadata,
      err: {
        message: metadata.err.message,
        name:    metadata.err.name,
        stack:   metadata.err.stack,
      },
    };
  }

  const entry = {
    time:  new Date().toISOString(),  
    level,
    msg:   message,
    ...metadata,                      
  };

  // warn/error → stderr (tách biệt với stdout để dễ filter trong log aggregator)
  // debug/info → stdout
  const output = level === 'error' || level === 'warn'
    ? process.stderr
    : process.stdout;

  output.write(JSON.stringify(entry) + '\n');
}

// ── Public API ─────────────────────────────────────────────────────────────
/**
 * Singleton logger object.
 * Mỗi method hỗ trợ 2 cách gọi:
 *   logger.info('message')
 *   logger.info({ key: value }, 'message')
 */
const logger = {
  /**
   * DEBUG — thông tin chi tiết cho development.
   * Không hiện trong production (LOG_LEVEL=info).
   * Dùng để trace luồng xử lý, giá trị biến, v.v.
   */
  debug: (meta, msg) => log('debug', meta, msg),

  /**
   * INFO — sự kiện bình thường quan trọng cần ghi lại.
   * Ví dụ: server started, order created, payment received.
   */
  info: (meta, msg) => log('info', meta, msg),

  /**
   * WARN — tình huống bất thường nhưng hệ thống vẫn hoạt động.
   * Ví dụ: Redis retry, rate limit hit, deprecated usage.
   */
  warn: (meta, msg) => log('warn', meta, msg),

  /**
   * ERROR — lỗi cần xử lý, có thể ảnh hưởng đến user.
   * Luôn truyền { err } để có stack trace đầy đủ.
   * Ví dụ: DB write failed, payment webhook invalid, OpenAI timeout.
   */
  error: (meta, msg) => log('error', meta, msg),
};

module.exports = logger;
