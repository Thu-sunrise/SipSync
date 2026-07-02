# 1. In ra Public IP của máy Master
output "master_ip" {
  value = aws_instance.k3s_casso_master.public_ip
}

# 2. In ra Public IP của 2 máy Worker (Dùng vòng lặp for vì worker có thuộc tính count = 2)
output "workers_ip" {
  value = [for worker in aws_instance.k3s_casso_worker : worker.public_ip]
}

# 3. Tạo sẵn lệnh SSH cho máy Master để bạn tiện bề copy/paste
output "ssh_command" {
  value = "ssh -i k3s-casso-key.pem ubuntu@${aws_instance.k3s_casso_master.public_ip}"
}
