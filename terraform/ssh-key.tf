# Đúc chìa khóa RSA
resource "tls_private_key" "k3s_casso_ssh_key" {
  algorithm = "ED25519"
}

# Đẩy mặt Public Key lên AWS
resource "aws_key_pair" "k3s_casso_keypair" {
  key_name   = "k3s-casso-key-v2"
  public_key = tls_private_key.k3s_casso_ssh_key.public_key_openssh
}

# Lưu mặt Private Key xuống máy của bạn thành file .pem
resource "local_file" "private_key" {
  content  = tls_private_key.k3s_casso_ssh_key.private_key_openssh
  filename = "${path.module}/k3s-casso-key.pem"
}
