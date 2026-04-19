# SipSync - Hệ Thống Đặt Món Thông Minh Tích Hợp AI

SipSync là một giải pháp quản lý và đặt món hiện đại, kết hợp sức mạnh của trí tuệ nhân tạo (OpenAI) để mang lại trải nghiệm đặt hàng tự nhiên và quy trình thanh toán tự động hoàn toàn qua VietQR (PayOS).

![SipSync Banner](https://img.shields.io/badge/Status-Live-success?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Stack-Fullstack-blue?style=for-the-badge)

## Tính năng nổi bật

- **AI Ordering Bot**: Tự động nhận diện món ăn, size, số lượng từ tin nhắn tự nhiên của khách hàng.
- **Đa nền tảng**: Hỗ trợ Dashboard Admin trên Web và Bot đặt hàng trên Telegram.
- **Thanh toán tự động**: Tích hợp PayOS tạo mã VietQR theo từng đơn hàng, tự động xác nhận khi nhận tiền.
- **Real-time Updates**: Quản trị viên nhận thông báo đơn hàng mới tức thì qua Socket.io.
- **Deploy sẵn sàng**: Hỗ trợ Docker và file cấu hình cho Koyeb (CI/CD).

## Công nghệ sử dụng

- **Frontend**: React.js, Vite, TailwindCSS, Socket.io-client.
- **Backend**: Node.js, Express, MongoDB, Redis, OpenAI SDK.
- **Infrastructure**: Docker, Docker Compose, Koyeb, GitHub Actions.

## Hướng dẫn cài đặt nhanh

### 1. Yêu cầu hệ thống
- Node.js v20+
- Docker & Docker Compose (Nếu chạy bằng container)
- Tài khoản OpenAI API, PayOS và Telegram Bot.

### 2. Chạy với Docker (Khuyên dùng)
```bash
# Clone dự án
git clone https://github.com/Thu-sunrise/SipSync.git
cd SipSync

# Chạy Docker Compose
docker compose up --build -d
```
Hệ thống sẽ chạy tại:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`

### 3. Cài đặt thủ công (Local Development)

**Backend:**
```bash
cd backend
npm install
# Tạo file .env và điền các thông số cần thiết
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
# Tạo file .env (VITE_API_URL=http://localhost:8000)
npm run dev
```

## Cấu hình biến môi trường (.env)

| Biến | Mô tả |
| :--- | :--- |
| `MONGO_URI` | Đường dẫn kết nối MongoDB Atlas |
| `REDIS_URL` | Đường dẫn kết nối Redis (Upstash) |
| `OPENAI_API_KEY` | Mã bí mật từ OpenAI Dashboard |
| `PAYOS_CLIENT_ID` | Client ID từ PayOS |
| `TELEGRAM_BOT_TOKEN`| Token của Bot tạo từ BotFather |

## Triển khai lên Cloud (Koyeb)

Dự án đã được cấu hình sẵn file `koyeb.yaml`. Để triển khai:
1. Đẩy mã nguồn lên GitHub.
2. Kết nối repo với Koyeb.
3. Tạo các **Secrets** trên giao diện Koyeb tương ứng với các biến trong `.env`.
4. Koyeb sẽ tự động build và deploy dựa trên file cấu hình.

## Cấu trúc thư mục
```text
SipSync/
├── backend/            # Mã nguồn server (Node.js)
│   ├── src/modules/    # Các module (AI, Payment, Bot, Order...)
│   └── Dockerfile
├── frontend/           # Mã nguồn giao diện (React)
│   ├── src/            # Components, Pages, Services
│   └── Dockerfile
├── koyeb.yaml          # File cấu hình deploy tự động
└── docker-compose.yml  # File chạy local với Docker
```

## Giấy phép
Dự án được phát hành dưới giấy phép [MIT](LICENSE).

---
*Phát triển bởi [Thu-sunrise](https://github.com/Thu-sunrise) - 2026*