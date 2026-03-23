variable "prefix" { type = string }
variable "api_url" { type = string }

resource "aws_s3_bucket" "frontend" {
  bucket        = "${var.prefix}-frontend"
  force_destroy = true
  tags          = { Project = "nxt-msa" }
}

resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  index_document { suffix = "index.html" }
  error_document { key = "index.html" }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "PublicReadGetObject"
      Effect    = "Allow"
      Principal = "*"
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.frontend.arn}/*"
    }]
  })

  depends_on = [aws_s3_bucket_public_access_block.frontend]
}

# API_BASE를 주입한 config.js 업로드
resource "aws_s3_object" "config_js" {
  bucket       = aws_s3_bucket.frontend.id
  key          = "js/config.js"
  content      = "window.API_BASE = '${var.api_url}';\n"
  content_type = "application/javascript"
}

output "website_url" {
  value = aws_s3_bucket_website_configuration.frontend.website_endpoint
}

output "bucket_name" {
  value = aws_s3_bucket.frontend.id
}
