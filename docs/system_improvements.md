# Đề Xuất Cải Thiện Hệ Thống (Actionable Improvements)

Tài liệu này ghi chú lại 3 đề xuất nâng cấp hệ thống để đạt chuẩn kiến trúc phân tán (Distributed Architecture) và tự động hoá hoàn toàn (Fully Automated CI/CD).

---

## 1. Hoàn thiện Tự động hoá CI/CD Secrets

Hiện tại file `secret.yaml` đang được ignore khỏi git và đưa lên server một cách thủ công, điều này gây rườm rà khi cần xoay vòng khoá (Key Rotation).

**Giải pháp:** Bổ sung bước tự động sinh file `secret.yaml` từ GitHub Secrets trực tiếp trong pipeline `.github/workflows/backend.yml` (chèn trước bước SCP).

```yaml
      - name: 6.5. Tự động sinh file K8s Secret từ GitHub Secrets
        run: |
          cat <<EOF > k8s/prod/secret.yaml
          apiVersion: v1
          kind: Secret
          metadata:
            name: backend-secret
            namespace: casso-prod
          type: Opaque
          stringData:
            MONGO_URI: "${{ secrets.MONGO_URI }}"
            REDIS_URL: "${{ secrets.REDIS_URL }}"
            GROQ_API_KEY: "${{ secrets.GROQ_API_KEY }}"
            PAYOS_API_KEY: "${{ secrets.PAYOS_API_KEY }}"
            PAYOS_CHECKSUM_KEY: "${{ secrets.PAYOS_CHECKSUM_KEY }}"
            TELEGRAM_BOT_TOKEN: "${{ secrets.TELEGRAM_BOT_TOKEN }}"
            TELEGRAM_WEBHOOK_TOKEN: "${{ secrets.TELEGRAM_WEBHOOK_TOKEN }}"
            JWT_SECRET: "${{ secrets.JWT_SECRET }}"
            ADMIN_PASSWORD: "${{ secrets.ADMIN_PASSWORD }}"
            TUNNEL_TOKEN: "${{ secrets.TUNNEL_TOKEN }}"
          EOF
```
*Lợi ích:* Code không bao giờ chứa thông tin nhạy cảm nhưng luồng CI/CD vẫn được tự động 100%.

---

## 2. Nâng cấp Xử lý Bất đồng bộ cho Webhook (Async Webhook)

Hiện tại ở `bot.controller.js`, luồng xử lý Webhook của Telegram đang là xử lý đồng bộ (Synchronous). Hệ thống phải đợi AI xử lý xong (tốn vài giây) mới gọi `res.sendStatus(200)`, dễ dẫn đến lỗi timeout từ phía Telegram và gây ra tình trạng Retry Loop.

**Giải pháp:**
Cơ cấu lại luồng webhook theo chuẩn Async Handling:
1. Vừa nhận request từ Telegram -> Xác thực token -> Trả `res.sendStatus(200)` ngay lập tức.
2. Đẩy logic gọi `AiService` và cập nhật DB vào xử lý ngầm (background job). Có thể dùng `BullMQ` (Redis-based queue) hoặc đơn giản là tách ra không `await` trong controller.
3. Khi AI suy nghĩ và trả lời xong, gọi HTTP Post qua API của Telegram để gửi tin nhắn phản hồi cho người dùng.

*Lợi ích:* Không bao giờ bị dính timeout webhook, nâng cao tính phản hồi của hệ thống.

---

## 3. Nâng cấp Scale Backend (Socket.io Redis Adapter & Session Affinity)

Nếu triển khai Backend trên K8s với cấu hình `replicas: 2` trở lên, người dùng truy cập Dashboard sẽ gặp lỗi Socket "Session ID unknown" liên tục do cơ chế long-polling của Socket.io bị văng giữa các Pods (Request A vào Pod 1, Request B vào Pod 2).

**Giải pháp:**

**Ở mã nguồn (Backend):** 
Cài đặt `@socket.io/redis-adapter` để đồng bộ các sự kiện real-time giữa các Node.js Process.
```javascript
// server.js
const { createAdapter } = require('@socket.io/redis-adapter');
const pubClient = getRedisClient();
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));
```

**Ở cấu hình hạ tầng (Kubernetes):**
Bổ sung cấu hình bám dính phiên (Sticky Session) vào Service.
```yaml
# k8s/prod/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: casso-backend-service
  namespace: casso-prod
spec:
  type: NodePort
  sessionAffinity: ClientIP  # <-- Bổ sung dòng này
  selector:
    app: casso-backend
  ports:
    - port: 8000
      targetPort: 8000
      nodePort: 30000
```

*Lợi ích:* Hỗ trợ Horizontal Scaling tuyệt đối, dễ dàng đáp ứng khi lượng truy cập tăng vọt.
