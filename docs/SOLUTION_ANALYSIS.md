# Tài liệu Phân tích Giải pháp Dự án SipSync

## 1. Tổng quan dự án
**SipSync** là một hệ thống quản lý và đặt món thông minh dành cho các cửa hàng trà sữa/cà phê, tập trung vào việc tối ưu hóa trải nghiệm khách hàng thông qua giao diện Chatbot AI và quy trình thanh toán tự động.

## 2. Thách thức và Giải pháp

### 2.1. Thách thức
- Việc đặt món truyền thống qua tin nhắn thường gây tốn thời gian cho nhân viên để xác nhận và nhập liệu thủ công.
- Khách hàng khó nắm bắt menu và trạng thái đơn hàng một cách trực quan khi chat.
- Quy trình thanh toán và xác nhận tiền về thường bị ngắt quãng.

### 2.2. Giải pháp của SipSync
- **AI Chatbot (GPT-4o-mini)**: Tự động phân tích ngôn ngữ tự nhiên của khách hàng để trích xuất món ăn, size, số lượng và ghi chú.
- **Đa kênh (Multi-channel)**: Hỗ trợ đặt hàng cả trên giao diện Web Dashboard và Telegram Bot.
- **Thanh toán tự động (PayOS)**: Tích hợp cổng thanh toán VietQR, tự động xác nhận đơn hàng khi tiền vào tài khoản.
- **Real-time Updates**: Sử dụng Socket.io để cập nhật trạng thái đơn hàng tức thì cho quản trị viên.

## 3. Kiến trúc hệ thống (System Architecture)

### 3.1. Sơ đồ khối
Hệ thống được thiết kế theo mô hình Monorepo, chia làm hai phần chính:
- **Frontend**: React.js (Vite) + TailwindCSS.
- **Backend**: Node.js (Express) + MongoDB + Redis.

### 3.2. Luồng xử lý (Data Flow)
1. **Khách hàng** nhắn tin (Telegram) hoặc chọn món (Web).
2. **Backend** nhận dữ liệu:
   - Nếu là chat: Gửi sang **OpenAI API** để phân tích Intent và trích xuất Entity.
   - Nếu là order: Lưu vào **Redis (Cart Service)**.
3. **Thanh toán**: Khi khách chốt đơn, hệ thống tạo link thanh toán qua **PayOS**.
4. **Xác nhận**: PayOS gửi Webhook về Backend -> Cập nhật trạng thái đơn hàng -> Thông báo qua **Socket.io**.

## 4. Chi tiết công nghệ sử dụng (Technology Stack)

| Thành phần | Công nghệ | Mục đích |
| :--- | :--- | :--- |
| **Language** | Node.js (ES6+) | Môi trường thực thi backend hiệu năng cao. |
| **Database** | MongoDB (Mongoose) | Lưu trữ dữ liệu menu, đơn hàng, khách hàng (NoSQL). |
| **Caching/Session**| Redis (IoRedis) | Quản lý giỏ hàng tạm thời và chống trùng lặp tin nhắn (Idempotency). |
| **AI Engine** | OpenAI SDK | Xử lý ngôn ngữ tự nhiên, đóng vai "Cô chủ tiệm". |
| **Payment** | PayOS SDK | Xử lý thanh toán QR Code tự động. |
| **Real-time** | Socket.io | Truyền tải thông tin đơn hàng mới tức thì. |
| **Infrastructure** | Docker & Koyeb | Đóng gói container và triển khai CI/CD tự động. |

## 5. Các tính năng kỹ thuật nổi bật

### 5.1. Persona-based AI
AI được cấu hình với System Prompt cụ thể để đóng vai "Cô chủ tiệm thân thiện", giúp cuộc trò chuyện không bị khô khan và mang tính cá nhân hóa cao.

### 5.2. Cơ chế Idempotency
Sử dụng Redis để lưu trữ `update_id` từ Telegram trong 10 phút, đảm bảo mỗi tin nhắn của khách hàng chỉ được xử lý đúng một lần, tránh lãng phí tài nguyên AI và trùng lặp đơn hàng.

### 5.3. Quy trình CI/CD hiện đại
Tích hợp chặt chẽ giữa GitHub và Koyeb:
- Tự động kiểm tra lỗi (Lint/Build) trên GitHub Actions.
- Tự động deploy bản mới nhất khi merge code vào nhánh `main`.

## 6. Kế hoạch mở rộng (Roadmap)
- Cải thiện giao diện của Web, phần trang chủ giao diện chỉ hiện thị các đơn trong ngày để đơn giản hóa việc tiếp nhận thông tin có đơn đặt đến trong ngày cho mẹ, sẽ thêm các trang khác lưu thông tin về toàn bộ các đơn đã đặt.
- Hệ thống báo cáo doanh thu tiết bằng biểu đồ.
