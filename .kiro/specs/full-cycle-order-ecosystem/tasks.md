# Kế hoạch Triển khai: Hệ sinh thái Đặt hàng Toàn diện

## Tổng quan

Triển khai theo kiến trúc **modular monolith** với Node.js/Express (CommonJS). Mỗi task xây dựng tăng dần trên task trước, kết thúc bằng việc kết nối toàn bộ hệ thống. Ngôn ngữ: JavaScript thuần, `require`/`module.exports`.

---

## Tasks

- [ ] 1. Khởi tạo cấu trúc dự án và hạ tầng dùng chung
  - Tạo cấu trúc thư mục `src/modules/`, `src/shared/`, theo đúng thiết kế
  - Khởi tạo `package.json` với các dependency: `express`, `mongoose`, `ioredis`, `openai`, `@payos/node`, `socket.io`, `chokidar`, `prom-client`, `dotenv`
  - Tạo `src/shared/logger.js` — structured logging (JSON format, các level: info/warn/error)
  - Tạo `src/shared/redis.js` — singleton ioredis client kết nối Upstash Redis, xử lý lỗi kết nối
  - Tạo `src/shared/db.js` — singleton Mongoose connection đến MongoDB Atlas, xử lý lỗi kết nối
  - Tạo `src/shared/metrics.js` — khởi tạo `prom-client` registry, export các metric counter/gauge/histogram theo thiết kế
  - Tạo file `.env.example` với tất cả biến môi trường cần thiết
  - _Yêu cầu: 12.4_

- [ ] 2. Triển khai Menu_Catalog
  - [ ] 2.1 Implement CSV loader và in-memory store
    - Tạo `src/modules/menu/menuCatalog.js`
    - Đọc và parse file CSV theo format thiết kế (`item_id, name, price_m, price_l, description, category, available`)
    - Lưu dữ liệu vào in-memory Map để tra cứu nhanh
    - Ghi log lỗi chi tiết và throw error nếu file không tồn tại hoặc sai format — dừng khởi động hệ thống
    - _Yêu cầu: 1.1, 1.2_

  - [ ] 2.2 Implement internal API của Menu_Catalog
    - Implement `getAllItems()` → `MenuItem[]`
    - Implement `findByName(name)` → `MenuItem | null` với fuzzy matching Levenshtein distance ≤ 2 ký tự
    - Implement `getPrice(itemName, size)` → `number` (size: `'M'|'L'`), throw nếu không tìm thấy
    - Implement `reload()` → `Promise<void>` — atomic swap in-memory store
    - Export module theo CommonJS
    - _Yêu cầu: 1.3, 1.5, 5.2_

  - [ ]* 2.3 Viết unit test cho Menu_Catalog
    - Test `findByName` với tên chính xác, sai 1 ký tự, sai 2 ký tự, sai 3 ký tự (phải trả null)
    - Test `getPrice` với size M và L hợp lệ, size không hợp lệ
    - Test `reload` — dữ liệu cũ bị thay thế hoàn toàn
    - _Yêu cầu: 1.3, 1.4, 1.5_

  - [ ] 2.4 Implement hot-reload với chokidar
    - Tạo file watcher theo dõi thay đổi file CSV
    - Khi file thay đổi, gọi `reload()` và ghi log sự kiện
    - Đảm bảo request đang xử lý không bị ảnh hưởng (atomic swap)
    - _Yêu cầu: 1.4_

- [ ] 3. Khởi tạo Express app và Mongoose schemas
  - [ ] 3.1 Tạo Mongoose schemas
    - Tạo `src/modules/order/models.js` với `orderItemSchema`, `orderSchema`, `paymentSchema`, `orderStatusLogSchema` theo đúng thiết kế
    - Định nghĩa các index: `status`, `telegramUserId`, `createdAt`, `orderId`, `webhookEventId` (unique sparse)
    - Export `{ Order, Payment, OrderStatusLog, ORDER_STATUS, PAYMENT_STATUS, ITEM_SIZE }`
    - _Yêu cầu: 7.4, 8.4_

  - [ ] 3.2 Tạo Express app bootstrap
    - Tạo `src/app.js` — khởi tạo Express, đăng ký middleware (JSON body parser, error handler)
    - Kết nối MongoDB Atlas và Upstash Redis khi khởi động
    - Load Menu_Catalog khi khởi động, dừng nếu lỗi
    - Mount route `/health` trả về trạng thái các component (redis, mongodb, menu_catalog)
    - Mount route `/metrics` từ `prom-client`
    - _Yêu cầu: 1.2, 12.4_

- [ ] 4. Triển khai Cart_Manager
  - [ ] 4.1 Implement cart operations với Redis
    - Tạo `src/modules/cart/cartManager.js`
    - Implement `getCart(userId)`, `addItem(userId, item)`, `updateItem(userId, itemName, quantity)`, `removeItem(userId, itemName)`, `clearCart(userId)`
    - Dùng Redis Hash (`cart:{userId}`) với JSON serialized `CartItem[]`
    - TTL 24 giờ, reset mỗi khi có hoạt động
    - _Yêu cầu: 6.1, 6.2, 6.3_

  - [ ] 4.2 Implement atomic cart update với Redis MULTI/EXEC
    - Đảm bảo thao tác cập nhật cart là atomic (MULTI/EXEC hoặc Lua script)
    - Tránh race condition khi nhiều tin nhắn đến đồng thời từ cùng một user
    - _Yêu cầu: 6.5_

  - [ ] 4.3 Implement chat history operations
    - Implement `getHistory(userId)` → `Promise<ChatMessage[]>` — LRANGE lấy 20 tin nhắn gần nhất
    - Implement `appendHistory(userId, message)` → `Promise<void>` — LPUSH + LTRIM giữ tối đa 20 tin
    - TTL 24 giờ, reset mỗi khi có hoạt động
    - _Yêu cầu: 3.1, 3.2_

  - [ ] 4.4 Implement rate limiting
    - Implement `checkRateLimit(userId)` → `Promise<{ allowed: boolean, remaining: number }>`
    - Dùng Redis key `rate_limit:{userId}:{minute_timestamp}` với INCR + EXPIRE 60s
    - Giới hạn 20 tin nhắn/phút/user
    - _Yêu cầu: 11.1_

  - [ ]* 4.5 Viết unit test cho Cart_Manager
    - Test thêm/cập nhật/xóa món, kiểm tra TTL được reset
    - Test rate limit: đúng hạn mức, vượt hạn mức
    - Test chat history: LPUSH + LTRIM giữ đúng 20 tin
    - _Yêu cầu: 6.2, 6.5, 11.1_

- [ ] 5. Checkpoint — Kiểm tra hạ tầng cơ bản
  - Đảm bảo kết nối Redis và MongoDB thành công
  - Đảm bảo Menu_Catalog load được từ CSV mẫu
  - Đảm bảo `/health` trả về `status: "ok"` khi tất cả component hoạt động
  - Đảm bảo tất cả test hiện tại pass, hỏi người dùng nếu có vướng mắc.

- [ ] 6. Triển khai AI_Engine
  - [ ] 6.1 Implement OpenAI Structured Outputs integration
    - Tạo `src/modules/ai/aiEngine.js`
    - Định nghĩa `aiResponseSchema` JSON Schema theo đúng thiết kế (message, intent, order_entities, clarification_needed, clarification_field)
    - Gọi OpenAI API với `response_format: { type: 'json_schema', json_schema: { ... } }`
    - Ghi log thời gian phản hồi mỗi lần gọi API vào metric `ai_response_duration_ms`
    - _Yêu cầu: 5.1, 12.3_

  - [ ] 6.2 Implement system prompt và persona "Cô chủ tiệm"
    - Xây dựng system prompt theo cấu trúc thiết kế, inject menu items động
    - Đảm bảo AI phản hồi bằng ngôn ngữ khách dùng (tiếng Việt/tiếng Anh)
    - Đảm bảo AI chỉ gợi ý món có trong Menu_Catalog, không tự bịa
    - Đảm bảo AI hỏi lại khi không rõ tên món, số lượng hoặc size
    - _Yêu cầu: 4.1, 4.2, 4.3, 4.4, 5.3_

  - [ ] 6.3 Implement context history và fuzzy matching
    - Đính kèm tối đa 20 tin nhắn gần nhất từ `Cart_Manager.getHistory()` vào mỗi request
    - Sau khi nhận response, lưu tin nhắn mới vào history qua `Cart_Manager.appendHistory()`
    - Dùng `Menu_Catalog.findByName()` để fuzzy match tên món trong `order_entities`
    - _Yêu cầu: 3.2, 5.2_

  - [ ] 6.4 Implement rate limiting và error handling cho OpenAI
    - Giới hạn 100 lời gọi OpenAI API/phút ở cấp hệ thống
    - Implement exponential backoff khi nhận lỗi 429 từ OpenAI (tối đa 30 giây)
    - Implement circuit breaker: sau 5 lỗi liên tiếp trong 30s → open circuit, fallback response
    - Cập nhật counter `ai_calls_total` và `ai_errors_total`
    - _Yêu cầu: 4.5, 11.3, 11.4_

  - [ ]* 6.5 Viết unit test cho AI_Engine
    - Test parse response JSON Schema hợp lệ và không hợp lệ
    - Test fuzzy matching tên món qua `findByName`
    - Test exponential backoff khi nhận lỗi 429 (mock OpenAI client)
    - _Yêu cầu: 5.1, 5.2, 11.4_

- [ ] 7. Triển khai Order_Processor
  - [ ] 7.1 Implement tạo đơn hàng
    - Tạo `src/modules/order/orderProcessor.js`
    - Implement `POST /api/orders` — nhận `{ telegramUserId, customerName }`, lấy cart từ `Cart_Manager`
    - Validate: cart không rỗng, tất cả item tồn tại trong Menu_Catalog, tổng tiền > 0
    - Tính `unitPrice` cho mỗi item bằng `Menu_Catalog.getPrice(itemName, size)` — không chấp nhận giá tự khai
    - Lưu đơn hàng vào MongoDB với status `"Chờ thanh toán"`
    - Ghi `OrderStatusLog` với `changedBy: 'system'`
    - Cập nhật metric `orders_total_counter` và `order_processing_duration_ms`
    - _Yêu cầu: 7.1, 7.4, 11.5, 12.1_

  - [ ] 7.2 Implement REST API quản lý đơn hàng
    - Implement `GET /api/orders` — lấy danh sách đơn active, hỗ trợ query `?status=active&limit=50&offset=0`
    - Implement `GET /api/orders/:id` — lấy chi tiết đơn hàng
    - Implement `PATCH /api/orders/:id/status` — cập nhật trạng thái, validate enum `ORDER_STATUS`
    - Ghi `OrderStatusLog` cho mỗi thay đổi trạng thái
    - Cập nhật metric `orders_by_status_gauge`
    - _Yêu cầu: 9.2, 12.1_

  - [ ]* 7.3 Viết unit test cho Order_Processor
    - Test tạo đơn với cart hợp lệ — kiểm tra giá lấy từ Menu_Catalog
    - Test validation: cart rỗng, món không tồn tại, tổng tiền = 0
    - Test cập nhật trạng thái và ghi OrderStatusLog
    - _Yêu cầu: 7.1, 7.4, 11.5_

- [ ] 8. Triển khai Payment_Gateway
  - [ ] 8.1 Implement tạo VietQR với payOS SDK
    - Tạo `src/modules/payment/paymentGateway.js`
    - Khởi tạo `@payos/node` SDK với credentials từ biến môi trường
    - Implement `createPayment(order)` — gọi payOS API tạo payment link, lưu `Payment` record vào MongoDB
    - Trả về `{ qrCodeUrl, qrCodeImage, orderCode, amount, description, expiredAt }`
    - Cập nhật metric `payments_total`
    - _Yêu cầu: 7.2, 7.6_

  - [ ] 8.2 Implement HMAC webhook verification
    - Implement `verifyWebhookSignature(payload, signature, secret)` dùng `crypto.createHmac('sha256')` và `crypto.timingSafeEqual`
    - Mount `POST /webhook/payos` — xác thực chữ ký trước khi xử lý bất kỳ dữ liệu nào
    - Reject HTTP 400 và ghi log cảnh báo bảo mật nếu chữ ký không hợp lệ
    - Ghi log mọi webhook nhận được kèm kết quả xác thực
    - Cập nhật metric `payment_webhook_duration_ms`
    - _Yêu cầu: 8.1, 8.2, 12.2_

  - [ ] 8.3 Implement idempotency và cập nhật trạng thái đơn hàng
    - Kiểm tra `webhookEventId` trong collection `payments` trước khi xử lý (unique sparse index)
    - Nếu đã xử lý → bỏ qua, trả HTTP 200 ngay
    - Nếu chưa xử lý → cập nhật `Order.status` sang `"Chờ làm"`, lưu `webhookEventId`
    - Gọi `Order_Processor` để cập nhật trạng thái và ghi log
    - Trả HTTP 200 trong vòng 5 giây
    - Cập nhật metric `payments_success_total`
    - _Yêu cầu: 8.3, 8.4, 8.6_

  - [ ]* 8.4 Viết unit test cho Payment_Gateway
    - Test `verifyWebhookSignature` với signature hợp lệ và không hợp lệ
    - Test idempotency: gửi cùng webhook 2 lần, chỉ xử lý 1 lần
    - Test reject HTTP 400 khi chữ ký sai
    - _Yêu cầu: 8.1, 8.2, 8.4_

- [ ] 9. Checkpoint — Kiểm tra luồng đặt hàng và thanh toán
  - Đảm bảo luồng: tạo đơn → tạo VietQR → nhận webhook → cập nhật trạng thái hoạt động end-to-end
  - Đảm bảo idempotency webhook hoạt động đúng
  - Đảm bảo tất cả test hiện tại pass, hỏi người dùng nếu có vướng mắc.

- [ ] 10. Triển khai Realtime_Broadcaster
  - [ ] 10.1 Implement Socket.io server và room management
    - Tạo `src/modules/realtime/realtimeBroadcaster.js`
    - Khởi tạo Socket.io server gắn vào Express HTTP server
    - Khi client kết nối và emit `SUBSCRIBE_ORDERS` → join room `"admin-orders"`
    - Emit `CONNECTED` event khi client join thành công
    - _Yêu cầu: 9.3, 9.5_

  - [ ] 10.2 Implement broadcast events
    - Implement `emitOrderPaid(orderData)` — broadcast `ORDER_PAID` đến room `"admin-orders"`
    - Implement `emitOrderStatusChanged(orderId, newStatus, order)` — broadcast `ORDER_STATUS_CHANGED`
    - Gọi `emitOrderPaid` từ `Payment_Gateway` sau khi xử lý webhook thành công
    - Gọi `emitOrderStatusChanged` từ `Order_Processor` sau khi cập nhật trạng thái
    - _Yêu cầu: 8.5, 9.5_

- [ ] 11. Triển khai Telegram_Bot
  - [ ] 11.1 Implement webhook handler và message routing
    - Tạo `src/modules/bot/telegramBot.js`
    - Mount `POST /webhook/telegram` — nhận updates từ Telegram, validate format
    - Kiểm tra rate limit qua `Cart_Manager.checkRateLimit(userId)` trước khi xử lý
    - Nếu vượt rate limit → gửi thông báo thân thiện, bỏ qua tin nhắn
    - Gửi lời chào + hướng dẫn khi khách nhắn lần đầu trong ngày
    - _Yêu cầu: 2.1, 2.2, 2.3, 11.1, 11.2_

  - [ ] 11.2 Implement sendMessage và sendPhoto với retry logic
    - Implement `sendMessage(chatId, text)` — gọi Telegram Bot API
    - Implement `sendPhoto(chatId, photoUrl, caption)` — gửi ảnh QR
    - Retry tối đa 3 lần với exponential backoff 1s → 2s → 4s khi lỗi kết nối
    - Ghi log lỗi kèm thông tin đơn hàng nếu thất bại sau 3 lần
    - _Yêu cầu: 2.4, 10.4_

  - [ ] 11.3 Kết nối Telegram_Bot với AI_Engine và Cart_Manager
    - Khi nhận tin nhắn văn bản: lấy history từ `Cart_Manager`, gọi `AI_Engine.processMessage()`
    - Nhận response từ AI_Engine, cập nhật cart nếu có `order_entities`
    - Gửi `response.message` về cho khách qua `sendMessage`
    - Xử lý intent `confirm_order` → gọi `Order_Processor` tạo đơn → gửi QR qua `sendPhoto`
    - Xử lý intent `view_cart` → lấy cart từ `Cart_Manager`, format và gửi về khách
    - _Yêu cầu: 2.1, 6.1, 7.3_

  - [ ] 11.4 Implement thông báo sau thanh toán và hoàn thành đơn
    - Implement `notifyPaymentSuccess(telegramUserId, orderData)` — gửi xác nhận thanh toán kèm danh sách món và tổng tiền
    - Implement `notifyOrderCompleted(telegramUserId, orderData)` — gửi thông báo đơn hoàn thành
    - Gọi `notifyPaymentSuccess` từ `Payment_Gateway` sau khi xử lý webhook thành công
    - Gọi `notifyOrderCompleted` từ `Order_Processor` khi status cập nhật sang `"Xong"`
    - _Yêu cầu: 10.1, 10.2, 10.3_

  - [ ]* 11.5 Viết unit test cho Telegram_Bot
    - Test retry logic: mock Telegram API lỗi 3 lần, kiểm tra số lần retry và backoff
    - Test rate limit: mock `checkRateLimit` trả về `allowed: false`, kiểm tra thông báo gửi đi
    - Test routing intent: `confirm_order` gọi `Order_Processor`, `view_cart` gọi `Cart_Manager`
    - _Yêu cầu: 2.4, 11.1, 11.2_

- [ ] 12. Checkpoint — Kiểm tra luồng end-to-end Bot → AI → Cart → Order → Payment → Notify
  - Đảm bảo tin nhắn từ Telegram được xử lý đúng qua toàn bộ pipeline
  - Đảm bảo thông báo xác nhận thanh toán và hoàn thành đơn được gửi đúng
  - Đảm bảo tất cả test hiện tại pass, hỏi người dùng nếu có vướng mắc.

- [ ] 13. Triển khai Admin_Dashboard (React)
  - [ ] 13.1 Khởi tạo React app và cấu trúc component
    - Tạo React app trong thư mục `dashboard/` (Vite hoặc Create React App)
    - Cài đặt dependency: `socket.io-client`, `@dnd-kit/core`, `@dnd-kit/sortable`
    - Tạo cấu trúc component: `App`, `ConnectionStatus`, `KanbanBoard`, `KanbanColumn`, `OrderCard`
    - Cấu hình proxy đến backend Express trong môi trường development
    - _Yêu cầu: 9.1_

  - [ ] 13.2 Implement KanbanBoard và KanbanColumn
    - Implement `KanbanBoard` với 3 cột: `"Chờ làm"`, `"Đang làm"`, `"Xong"`
    - Implement `KanbanColumn` nhận `orders[]` và render danh sách `OrderCard`
    - Implement `OrderCard` hiển thị: tên khách (Telegram username), danh sách món kèm số lượng và ghi chú, tổng tiền, thời gian đặt hàng
    - _Yêu cầu: 9.1, 9.4_

  - [ ] 13.3 Implement drag-and-drop với @dnd-kit/core
    - Wrap `KanbanBoard` với `DndContext` từ `@dnd-kit/core`
    - Implement `onDragEnd` handler — xác định cột đích, gọi `PATCH /api/orders/:id/status`
    - Cập nhật state local ngay lập tức (optimistic update) trước khi nhận response từ server
    - _Yêu cầu: 9.5_

  - [ ] 13.4 Implement Socket.io client và realtime updates
    - Kết nối Socket.io client đến backend, emit `SUBSCRIBE_ORDERS` sau khi kết nối
    - Lắng nghe `ORDER_PAID` → thêm thẻ mới vào cột `"Chờ làm"` mà không reload trang
    - Lắng nghe `ORDER_STATUS_CHANGED` → di chuyển thẻ sang cột tương ứng
    - _Yêu cầu: 9.3, 9.5_

  - [ ] 13.5 Implement ConnectionStatus và auto-reconnect
    - Implement `ConnectionStatus` component hiển thị banner `"Mất kết nối"` khi WebSocket offline
    - Cấu hình Socket.io client tự động reconnect mỗi 5 giây
    - Khi reconnect thành công: ẩn banner, fetch lại danh sách đơn từ `GET /api/orders`
    - _Yêu cầu: 9.6_

  - [ ] 13.6 Implement initial data load
    - Khi Dashboard tải lần đầu, gọi `GET /api/orders` để lấy tất cả đơn đang active
    - Phân loại đơn vào đúng cột theo `status`
    - Hiển thị loading state trong khi fetch
    - _Yêu cầu: 9.2_

- [ ] 14. Triển khai Monitoring
  - [ ] 14.1 Hoàn thiện Prometheus metrics
    - Đảm bảo tất cả metric đã định nghĩa trong `src/shared/metrics.js` được cập nhật đúng từ các module
    - Kiểm tra endpoint `GET /metrics` trả về format Prometheus text đúng chuẩn
    - Kiểm tra endpoint `GET /health` trả về trạng thái đầy đủ các component
    - _Yêu cầu: 12.4, 12.5_

  - [ ]* 14.2 Viết integration test cho metrics endpoint
    - Test `GET /metrics` trả về HTTP 200 và content-type `text/plain`
    - Test `GET /health` trả về đúng cấu trúc `{ status, components }`
    - _Yêu cầu: 12.4_

- [ ] 15. Cấu hình triển khai Koyeb
  - Tạo `Procfile` hoặc `koyeb.yaml` với lệnh start cho backend
  - Tạo `dashboard/` build script cho React SPA
  - Tạo tài liệu biến môi trường cần thiết cho Koyeb (cập nhật `.env.example`)
  - Đảm bảo `PORT` được đọc từ biến môi trường (Koyeb inject tự động)
  - Cấu hình Telegram webhook URL trỏ đến Koyeb endpoint sau khi deploy
  - _Yêu cầu: 2.1_

- [ ] 16. Checkpoint cuối — Kiểm tra toàn bộ hệ thống
  - Đảm bảo tất cả test pass
  - Đảm bảo luồng đầy đủ hoạt động: Telegram → AI → Cart → Order → payOS → Webhook → Dashboard → Notify
  - Đảm bảo `/health` và `/metrics` hoạt động đúng
  - Hỏi người dùng nếu có vướng mắc trước khi deploy.

---

## Ghi chú

- Task đánh dấu `*` là tùy chọn, có thể bỏ qua để ra MVP nhanh hơn
- Mỗi task tham chiếu yêu cầu cụ thể để đảm bảo traceability
- Checkpoint giúp phát hiện lỗi sớm trước khi tiếp tục
- Tất cả giá tiền phải lấy từ `Menu_Catalog` — không được hardcode hay tự tính
- Tất cả module dùng CommonJS (`require`/`module.exports`)
