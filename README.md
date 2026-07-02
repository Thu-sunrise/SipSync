# SipSync - Hệ Thống Đặt Món Thông Minh Tích Hợp AI

SipSync là một giải pháp quản lý và đặt món hiện đại, kết hợp sức mạnh của trí tuệ nhân tạo (OpenAI) để mang lại trải nghiệm đặt hàng tự nhiên và quy trình thanh toán tự động hoàn toàn qua VietQR (PayOS).

Dự án được xây dựng trên nền tảng kiến trúc **Cloud-Native**, ứng dụng các tiêu chuẩn cao nhất của **DevSecOps** và **Infrastructure as Code (IaC)**.

![Status](https://img.shields.io/badge/Status-Production-success?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20Node.js%20%7C%20K8s-blue?style=for-the-badge)
![Infrastructure](https://img.shields.io/badge/Infra-AWS%20%7C%20Terraform-orange?style=for-the-badge)

## Tính năng nổi bật

- **AI Ordering Bot**: Tự động nhận diện món ăn, size, số lượng từ tin nhắn tự nhiên của khách hàng qua Telegram.
- **Thanh toán tự động**: Tích hợp PayOS tạo mã VietQR theo từng đơn hàng, Webhook xác nhận tức thì khi nhận tiền.
- **Real-time Dashboard**: Quản trị viên nhận thông báo đơn hàng mới theo thời gian thực qua Socket.io.
- **Tự động hóa CI/CD**: Hệ thống tự động Build và Deploy lên AWS thông qua Github Actions với nguyên tắc Zero Downtime.

## Kiến trúc Hệ thống (System Architecture)

- **Frontend (Web App)**: Xây dựng bằng React/Vite, lưu trữ tĩnh trên **AWS S3** và được tăng tốc/bảo mật HTTPS bởi mạng lưới CDN của **Cloudflare**.
- **Backend (API & Bot)**: Chạy dưới dạng Container trên cụm **Kubernetes (K3s)** đặt tại máy chủ **AWS EC2**. Giao tiếp với thế giới bên ngoài thông qua **Cloudflare Zero Trust Tunnels**, loại bỏ hoàn toàn việc mở port public.
- **Database**:
  - **Production (`casso-prod`)**: Sử dụng MongoDB Atlas (DBaaS) để đảm bảo tính sẵn sàng cao.
  - **Testing (`casso-test`)**: Tự động cấp phát Persistent Volume (PV/PVC) và StatefulSet chạy MongoDB nội bộ K8s, tối ưu chi phí test.
- **Infrastructure**: Toàn bộ máy chủ EC2, mạng (VPC), và kho chứa (S3) được cấp phát và quản lý tự động bằng **Terraform**.

## Hướng dẫn Cài đặt & Triển khai

### 1. Yêu cầu hệ thống
- Terraform (dành cho IaC)
- `kubectl` và `aws-cli`
- Tài khoản: AWS, Cloudflare, OpenAI, PayOS, Telegram Bot.

### 2. Phát triển cục bộ (Local Development)
Dự án vẫn hỗ trợ môi trường phát triển nhanh gọn bằng Docker:
```bash
git clone https://github.com/Thu-sunrise/SipSync.git
cd SipSync
docker compose up --build -d
```
- Frontend: `http://localhost:80`
- Backend: `http://localhost:8000`

### 3. Triển khai Lên Đám Mây (Production CI/CD)
Mọi thao tác đẩy code đã được tự động hóa hoàn toàn bằng Github Actions. Lập trình viên chỉ cần:
```bash
git add .
git commit -m "feat: your new feature"
git push origin main
```
Hệ thống CI/CD sẽ tự động:
1. Build React và đồng bộ hóa (sync) thư mục `dist` lên AWS S3.
2. Build Docker Image cho Backend, đẩy lên Docker Hub.
3. SSH ngầm vào Master Node, ra lệnh Kubernetes kéo Image mới về thay thế Pod cũ mà không làm gián đoạn dịch vụ.

### 4. Cẩm nang Khôi phục Thảm họa (Sau khi chạy `terraform destroy`)

Việc chạy `terraform destroy` sẽ xóa sạch máy ảo EC2 để tiết kiệm chi phí, nhưng đồng thời làm mất toàn bộ cụm K8s. Để khôi phục hệ thống (Rebuild từ đầu) siêu tốc, bạn hãy copy/paste lần lượt các lệnh sau:

**1. Khởi tạo lại Hạ tầng AWS:**
```bash
cd terraform
terraform apply -auto-approve
```
*(Đợi 1 phút, copy lại cái IP Public mới sinh ra)*

**2. Cài đặt lại Kubernetes (K3s):**
```bash
# Thay <IP_MOI> bằng IP Public mới
ssh -i "khoa-cua-ban.pem" ubuntu@<IP_MOI>
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="server" sh -
```

**3. Cập nhật Kubeconfig về Laptop:**
```bash
# Mở Terminal mới trên laptop, kéo file config về
scp -i "khoa-cua-ban.pem" ubuntu@<IP_MOI>:/etc/rancher/k3s/k3s.yaml ~/.kube/config
# Sửa IP 127.0.0.1 thành IP Public mới
sed -i 's/127.0.0.1/<IP_MOI>/g' ~/.kube/config
```

**4. Phục hồi Namespace và Quota (Giai đoạn 0):**
```bash
# Đứng ở thư mục gốc Casso
kubectl create namespace casso-prod
kubectl create namespace casso-test
kubectl apply -f k8s/prod/quota-prod.yaml
kubectl apply -f k8s/test/quota-test.yaml
```

**5. Phục hồi Database Cục bộ cho phòng Test (Giai đoạn 0.5):**
```bash
kubectl apply -f k8s/test/mongo-pvc.yaml
kubectl apply -f k8s/test/mongo-service.yaml
kubectl apply -f k8s/test/mongo-statefulset.yaml
```

**6. Deploy lại Backend và Nối cáp Cloudflare (Giai đoạn 1):**
```bash
# Lệnh này sẽ dựng lại Backend và đánh thức đường hầm apihub.hubsunrise.me
kubectl apply -f k8s/prod/
```

**7. Cắm lại Webhook cho Telegram (Khôi phục luồng tin nhắn):**
```bash
curl -X POST "https://api.telegram.org/bot8695936469:AAHelO8lsxu8HX9mHGStyqt-kdi24PatAuE/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://apihub.hubsunrise.me/webhook/telegram", "secret_token": "your_secret_token"}'
```

## Cấu hình Biến Môi trường (Environment Variables)
*Lưu ý: Các biến này được quản lý an toàn qua Github Secrets và K8s Secrets, không đẩy lên Git.*

| Biến | Mô tả |
| :--- | :--- |
| `MONGO_URI` | Đường dẫn kết nối MongoDB Atlas / Local K8s |
| `REDIS_URL` | Đường dẫn kết nối Redis (Upstash) |
| `OPENAI_API_KEY` | Mã bí mật từ OpenAI Dashboard |
| `PAYOS_CLIENT_ID` | Client ID từ PayOS |
| `TELEGRAM_BOT_TOKEN`| Token của Bot tạo từ BotFather |

## Cấu trúc Thư mục Kỹ thuật
```text
SipSync/
├── backend/            # Mã nguồn server Node.js
├── frontend/           # Mã nguồn giao diện React
├── k8s/                # Cấu hình Kubernetes (Chia theo namespace prod/test)
├── terraform/          # Cấu hình Hạ tầng dưới dạng Code (IaC) AWS
├── .github/workflows/  # Kịch bản tự động hóa CI/CD
└── docker-compose.yml  # Dành cho Local Development
```

## Giấy phép
Dự án được phát hành dưới giấy phép [MIT](LICENSE).

---
*Phát triển bởi [Thu-sunrise](https://github.com/Thu-sunrise) - 2026*