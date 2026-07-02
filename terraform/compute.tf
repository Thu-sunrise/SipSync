# Khai báo cấu hình chung (Amazon Linux 2023, t3.small)
locals {
  ami_id        = "ami-04c913012f8977029" # ID của Amazon Linux 2023 | ami-0ef5fc922c3794ed9 mới là id của ubuntu 24.04 cùng Singapore
  instance_type = "t3.small" 
}

# Tạo 1 máy Master
resource "aws_instance" "k3s_casso_master" {
  ami = local.ami_id
  instance_type = local.instance_type
  
  subnet_id = aws_subnet.k3s_casso_subnet.id
  vpc_security_group_ids = [aws_security_group.k3s_casso_sg.id]
  key_name = aws_key_pair.k3s_casso_keypair.key_name
  tags = { Name = "k3s-casso-master" }
}

# tạo 2 máy Worker
resource "aws_instance" "k3s_casso_worker" {
    count = 2
    ami = local.ami_id
    instance_type = local.instance_type
    subnet_id = aws_subnet.k3s_casso_subnet.id
    vpc_security_group_ids = [aws_security_group.k3s_casso_sg.id]
    key_name = aws_key_pair.k3s_casso_keypair.key_name
    tags = { Name = "k3s-casso-worker-${count.index + 1}" }
}


