terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

variable "bucket_name" {
  type    = string
  default = "nxt-msa-workshop"
}

# S3 버킷
resource "aws_s3_bucket" "workshop" {
  bucket = var.bucket_name
  tags   = { Project = "nxt-msa" }
}

# 정적 웹사이트 호스팅
resource "aws_s3_bucket_website_configuration" "workshop" {
  bucket = aws_s3_bucket.workshop.id

  index_document { suffix = "index.html" }
  error_document { key = "404/index.html" }
}

# 퍼블릭 액세스 허용
resource "aws_s3_bucket_public_access_block" "workshop" {
  bucket = aws_s3_bucket.workshop.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# 버킷 정책 — 퍼블릭 읽기
resource "aws_s3_bucket_policy" "workshop" {
  bucket     = aws_s3_bucket.workshop.id
  depends_on = [aws_s3_bucket_public_access_block.workshop]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "PublicReadGetObject"
      Effect    = "Allow"
      Principal = "*"
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.workshop.arn}/*"
    }]
  })
}

output "website_url" {
  value = aws_s3_bucket_website_configuration.workshop.website_endpoint
}

output "bucket_name" {
  value = aws_s3_bucket.workshop.id
}
