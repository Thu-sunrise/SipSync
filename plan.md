# Kế hoạch Triển khai Kiến trúc K8s Toàn diện (Casso)

Mục tiêu của Kế hoạch này là giúp bạn hoàn thiện hệ thống từ khâu Quy hoạch lõi, Lưu trữ State, Định tuyến đến Tự động hóa và Đảm bảo Chất lượng.

---

## Giai đoạn 0: Quy hoạch Kiến trúc Môi trường (Namespaces)
Dựa trên giới hạn tài nguyên của máy ảo AWS `t3.small` (2GB RAM), chúng ta sẽ chia cụm K8s thành **2 môi trường biệt lập**:
*   **Môi trường `casso-test` (Gộp chung Dev & Test):** Môi trường để bạn test code cục bộ và chạy tự động các kịch bản Integration Test trong CI/CD.
*   **Môi trường `casso-prod`:** Môi trường Khách hàng sử dụng thật (gắn với Cloudflare Tunnels).
*   **Hành động:** 
    * Chuyển đổi toàn bộ tài nguyên hiện tại từ phòng `default` sang `casso-prod`.
    * Cấu hình **ResourceQuota** để giới hạn CPU/RAM nghiêm ngặt cho từng phòng.

---

## Giai đoạn 0.5: Quản trị Lưu trữ (Thực hành K8s Storage)
Áp dụng chiến lược **Hybrid (Lai)** để đảm bảo an toàn và tối ưu học tập:

*   **1. Môi trường Production (`casso-prod`):**
    *   **Quyết định:** TIẾP TỤC SỬ DỤNG Bên thứ 3 (MongoDB Atlas và Upstash Redis). Giúp hệ thống đạt Uptime 99.99% không lo hỏng ổ cứng.
*   **2. Môi trường Kiểm thử (`casso-test`):**
    *   **Quyết định:** TỰ THIẾT LẬP DATABASE CHẠY CỤC BỘ TRÊN K8S.
    *   **Thực hành:** Cấu hình **PersistentVolume (PV)**, **PersistentVolumeClaim (PVC)** và **StatefulSet** để chạy MongoDB ngầm. Test xong sẽ tự xóa để giải phóng ổ cứng.

---

## Giai đoạn 1: Thiết lập Cloudflare Tunnels (Zero Trust) ✅ Đang thực hiện
*   **Trạng thái:** Đã hoàn thành viết file YAML, cấu hình trên web và kiểm chứng hoạt động.

---

## Giai đoạn 2: Tự động hóa CI/CD bằng GitHub Actions
*   **Luồng Frontend:** Tự động Build React/Vite ➔ Upload lên AWS S3 ➔ Xóa cache CloudFront.
*   **Luồng Backend:** Tự động Build Docker Image ➔ Đẩy lên Docker Hub ➔ SSH ngầm vào AWS Master ➔ Tự động `kubectl apply` vào đúng Namespace (`casso-test` hoặc `casso-prod`).
*   **Quản trị Webhook (Best Practice):** Tích hợp lệnh `curl` cấu hình Webhook (Telegram/PayOS) chạy tự động ngay sau khi deploy K8s thành công. Đảm bảo K8s Config hoàn toàn "sạch sẽ", tách rời trách nhiệm (Decoupled) theo tiêu chuẩn bảo mật DevSecOps.

---

## Giai đoạn 3: Kế hoạch Testing Hệ thống (Đảm bảo Chất lượng)
*   **Unit Tests:** Chạy các bài test hàm logic cơ bản trong Github Actions.
*   **Integration Tests:** Triển khai bản build vào phòng `casso-test`, kết nối với Database K8s Cục bộ (GĐ 0.5), giả lập bắn Webhook từ PayOS/Telegram xem Backend xử lý chuẩn không, test xong tự động xóa phòng `test`.
*   **Load Testing & Chaos Engineering:** Dùng K6 bắn tải ép K8s đẻ thêm Pod. Tự tay xóa Pod xem tốc độ phục hồi.

---

## Giai đoạn 4: Observability (Giám sát & Theo dõi)
*   **Liveness & Readiness Probes:** Dạy K8s nhận biết Pod "treo" để tự động giết và restart.
*   **Prometheus & Grafana:** Lắp "Camera an ninh" theo dõi RAM/CPU của cụm K8s theo thời gian thực. Bắn cảnh báo về Telegram khi RAM vượt ngưỡng 90%.

---

## ⚠️ User Review Required
Kế hoạch đã được tinh chỉnh hoàn hảo, "đo ni đóng giày" cho sức mạnh của con t3.small.

Nếu bạn không có điều chỉnh nào nữa, hãy tiến hành **chèn thẻ `namespace` vào các file YAML và gõ lệnh chuyển nhà** nhé! Đừng quên kiểm tra bộ nhớ RAM trước khi làm!
