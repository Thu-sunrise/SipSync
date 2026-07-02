# khai báo vpc
resource "aws_vpc" "k3s_casso_vpc" {
    cidr_block = "10.0.0.0/16"
    enable_dns_hostnames = true
    enable_dns_support = true

    tags = {
        Name = "k3s-casso-vpc"
    }
}

# chia subnet (public) để đặt 3 instance
resource "aws_subnet" "k3s_casso_subnet" {
    vpc_id = aws_vpc.k3s_casso_vpc.id 
    cidr_block = "10.0.1.0/24"
    map_public_ip_on_launch = true # Yêu cầu AWS tự cấp Public IP cho máy ảo

    tags = {
        Name = "k3s-casso-subnet"
    }
}

# tạo cổng kết nối Internet (Internet Gateway)
resource "aws_internet_gateway" "k3s_casso_igw" {
  vpc_id = aws_vpc.k3s_casso_vpc.id

  tags = { Name = "k3s-casso-igw" }
}

# tạo route table cho public subnet
resource "aws_route_table" "k3s_casso_rt" {
  vpc_id = aws_vpc.k3s_casso_vpc.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.k3s_casso_igw.id
  }
}

# gán route table vào subnet
resource "aws_route_table_association" "k3s_casso_rta" {
  subnet_id      = aws_subnet.k3s_casso_subnet.id
  route_table_id = aws_route_table.k3s_casso_rt.id
}


