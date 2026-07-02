resource "aws_security_group" "k3s_casso_sg" {
  name        = "k3s-casso-sg"
  vpc_id      = aws_vpc.k3s_casso_vpc.id

  # Cổng 22: Để bạn cắm cáp SSH vào máy cấu hình
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Cổng 6443: Để gọi lệnh K8s API (tcp)
  ingress {
    from_port   = 6443
    to_port     = 6443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # cổng 80 (http) để nhận webhook và cho truy cập web
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks  = ["0.0.0.0/0"]
  }

  # cổng 443 (https)
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks  = ["0.0.0.0/0"]
  }

   # Dải Port 30000-32767: NodePort mặc định của Kubernetes
   ingress {
    from_port   = 30000
    to_port     = 31500
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
   }

   # Cho phép các máy ảo trong cùng Group giao tiếp thoải mái với nhau
  ingress {
    from_port = 0
    to_port   = 0
    protocol  = "-1"
    self      = true 
  }

  # Cho phép máy ảo đi ra ngoài Internet (để tải thư viện)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}