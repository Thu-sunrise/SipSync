# Lộ trình Thực hành Tự dựng K8s trên AWS bằng Terraform (K3s -> Kubeadm)

Đây là một chiến thuật học cực kỳ thông minh! Bạn sẽ chia quá trình thành 2 Giai đoạn (Phases):
- **Phase 1 (Fast-track với K3s)**: Dựng cụm siêu tốc để không bị nản, tập trung 100% thời gian vào việc học cách đưa code/app của mình lên K8s (YAML, Pods, Services, Ingress, Helm).
- **Phase 2 (Hardcore với Kubeadm)**: Khi đã thành thạo việc "sử dụng" K8s, bạn đập bỏ cụm cũ, đi sâu vào "xây dựng" K8s từ các mảnh ghép thô sơ nhất để hiểu tận gốc rễ hệ thống.

> [!TIP]
> Đánh dấu `[x]` vào các ô trống khi bạn hoàn thành từng task nhé!

---

## 🟢 PHASE 1: HỌC TƯ DUY K8S NHANH GỌN VỚI K3S
*Mục tiêu: Vượt qua rào cản cài đặt hệ thống phức tạp, tập trung thao tác với chiếc điều khiển `kubectl`.*

### Mức độ 0: Infrastructure as Code (Terraform & AWS EC2)
- [ ] Dùng Terraform tạo VPC, Subnet, Internet Gateway.
- [ ] Cấu hình Security Group (Mở port 22 SSH, 6443 K8s API, 80/443 Web, và dải 30000-32767).
- [ ] Dùng Terraform cấp phát 3 máy ảo EC2 Ubuntu (1 Master, 2 Worker) và gắn SSH Key tự động.

### Mức độ 1: Khởi tạo K3s & Đưa App Lên
- [ ] **Dựng K3s siêu tốc:** SSH vào Master Node, chạy đúng 1 lệnh cài K3s `curl ... sh-`. Sau đó lấy Node Token.
- [ ] SSH vào 2 Worker Node, chạy lệnh cài K3s Agent và trỏ về IP của Master.
- [ ] Tải file `k3s.yaml` từ Master về máy tính cá nhân của bạn, đổi tên thành `~/.kube/config` để có thể dùng `kubectl` trực tiếp từ laptop điều khiển server.
- [ ] Tối ưu Dockerfile, build image dự án Casso và push lên Docker Hub.
- [ ] Viết `deployment.yaml` kéo image về, tạo `ConfigMap` và `Secret` cho môi trường. 
- [ ] Viết `service.yaml` (dùng NodePort) và chạy thử thành công trên trình duyệt.

### Mức độ 2: Tận dụng Hệ sinh thái K3s (Trung cấp)
- [ ] **Định tuyến (Ingress):** K3s đã cài sẵn Traefik Ingress. Bạn không cần cài gì thêm, chỉ cần viết file `ingress.yaml` để map tên miền ảo vào Service.
- [ ] **Storage:** K3s đã tích hợp sẵn Storage. Khởi tạo MongoDB/Redis trên K8s và tạo Persistent Volume Claim (PVC) để lưu data xuống ổ cứng máy ảo cực nhàn.
- [ ] Bổ sung `livenessProbe` và `readinessProbe` vào app Backend.
- [ ] Đóng gói đống YAML trên thành **Helm Chart**.

### Mức độ 3: Tự động hóa CI/CD
- [ ] Cấu hình **Github Actions**: Khi push code lên nhánh `main` -> Tự động Build Image -> Push lên Docker Hub -> Tự động SSH vào máy K3s Master để chạy lệnh cập nhật phiên bản app mới nhất.

---

## 🔴 PHASE 2: TRỞ THÀNH KỸ SƯ HỆ THỐNG VỚI KUBEADM
*Mục tiêu: Đập bỏ K3s, tự tay lắp ráp K8s từ các thành phần lõi.*

### Mức độ 4: Hủy diệt và Tái sinh
- [ ] Chạy lệnh `k3s-uninstall.sh` và `k3s-agent-uninstall.sh` để dọn sạch K3s khỏi các máy ảo. (Hoặc xịn hơn: dùng Terraform gõ `terraform destroy` rồi `terraform apply` để đập đi xây lại 3 máy ảo EC2 mới tinh).

### Mức độ 5: Lắp ráp phần lõi (The Hard Way)
- [ ] **Chuẩn bị OS:** Tắt Swap trên cả 3 máy (yêu cầu bắt buộc của kubeadm), bật IPv4 forwarding.
- [ ] **Cài Runtime:** Tự tải và cấu hình Container Runtime (`containerd`) trên cả 3 nodes, chỉnh cgroup driver thành `systemd`.
- [ ] **Cài Kubeadm:** Cài đặt `kubeadm`, `kubelet`, `kubectl` thông qua package manager của Ubuntu (apt).
- [ ] Khởi tạo Master bằng `kubeadm init`. Chú ý quan sát màn hình log để xem nó kéo các thành phần lõi (API server, etcd, controller) về như thế nào.
- [ ] Copy lệnh `kubeadm join` (chứa token) và dán vào 2 Worker Node.

### Mức độ 6: Vá những lỗ hổng (Component còn thiếu)
- [ ] **Networking:** Lúc này gõ `kubectl get nodes` sẽ thấy trạng thái `NotReady` vì cụm chưa có mạng nội bộ. Hãy tự đi tìm và cài đặt một Network Plugin (CNI) như **Calico** hoặc **Flannel**.
- [ ] **Ingress:** Kubeadm trắng tinh, không có Ingress. Bạn phải tự cài đặt NGINX Ingress Controller (bản dành cho Bare-metal).
- [ ] **Storage:** Kubeadm không tự cấp ổ cứng. Bạn phải tự tìm cài đặt một Provisioner (ví dụ cài lại chính thằng *Local Path Provisioner* của Rancher) thì PVC mới hoạt động được.

### Mức độ 7: Tái triển khai ứng dụng
- [ ] Lấy chính bộ Helm Chart / YAML đã viết ở Phase 1 đem ra chạy lệnh `helm install` hoặc `kubectl apply -f` trên cụm Kubeadm mới này.
- [ ] **Tận hưởng thành quả:** Mọi thứ ứng dụng vẫn chạy y hệt như cũ, nhưng lần này bạn hoàn toàn tự hào vì hệ thống hạ tầng bên dưới 100% do chính tay bạn lắp ráp và cấu hình!
