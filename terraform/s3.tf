resource "aws_s3_bucket" "frontend_bucket" {
    bucket = "web.hubsunrise.me"
}

resource "aws_s3_bucket_website_configuration" "frontend_website" {
    bucket = aws_s3_bucket.frontend_bucket.id
    index_document {
        suffix = "index.html"
    }
}

# Tắt lớp khiên chặn "Public Access" mặc định của AWS
resource "aws_s3_bucket_public_access_block" "frontend_public_access" {
  bucket = aws_s3_bucket.frontend_bucket.id
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}
# 4. Cấp giấy phép (Policy) cho mọi người trên thế giới được Đọc (Read) file
resource "aws_s3_bucket_policy" "allow_public_read" {
  bucket = aws_s3_bucket.frontend_bucket.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.frontend_bucket.arn}/*"
      },
    ]
  })
  depends_on = [aws_s3_bucket_public_access_block.frontend_public_access]
}
# 5. In link trang web ra Terminal sau khi chạy xong
output "frontend_website_url" {
  value = aws_s3_bucket_website_configuration.frontend_website.website_endpoint
}