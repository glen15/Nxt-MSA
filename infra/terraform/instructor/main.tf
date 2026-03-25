terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# 최신 Amazon Linux 2023 AMI (ARM/Graviton)
data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-arm64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# 기본 VPC 사용
data "aws_vpc" "default" {
  default = true
}

# 퍼블릭 IP 자동 할당이 켜진 서브넷만 선택
data "aws_subnets" "public" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }

  filter {
    name   = "map-public-ip-on-launch"
    values = ["true"]
  }
}

# Security Group — 공장 포트 3개 + SSH
resource "aws_security_group" "factory" {
  name        = "nxt-msa-factory-sg"
  description = "MSA factory servers - ports 3001-3003"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidrs
  }

  ingress {
    description = "Factory Hub Dashboard"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidrs
  }

  ingress {
    description = "Factory Servers (3001-3003)"
    from_port   = 3001
    to_port     = 3003
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidrs
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "nxt-msa-factory-sg"
    Project = "nxt-msa"
    Role    = "instructor"
  }
}

# IAM Role — 공장 EC2 (SNS 발행 권한)
resource "aws_iam_role" "factory" {
  name = "nxt-msa-factory-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })

  tags = { Project = "nxt-msa" }
}

resource "aws_iam_role_policy" "factory_sns" {
  name = "factory-sns-publish"
  role = aws_iam_role.factory.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["sns:Publish"]
      Resource = "*"
    }]
  })
}

resource "aws_iam_instance_profile" "factory" {
  name = "nxt-msa-factory-profile"
  role = aws_iam_role.factory.name
}

# EC2 인스턴스 — 공장 서버 4개 (엔진/타이어/배터리/허브 대시보드)
resource "aws_instance" "factory" {
  ami                    = data.aws_ami.al2023.id
  instance_type          = var.instance_type
  key_name               = var.key_name
  vpc_security_group_ids = [aws_security_group.factory.id]
  iam_instance_profile   = aws_iam_instance_profile.factory.name
  subnet_id                   = data.aws_subnets.public.ids[0]
  associate_public_ip_address = true

  # IMDSv2 필수 (AL2023 기본 동작과 일치)
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 2
  }

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
  }

  user_data = base64encode(templatefile("${path.module}/userdata.sh", {
    receiving_topic_arn = var.receiving_topic_arn
    aws_region          = var.aws_region
  }))

  tags = {
    Name    = "nxt-msa-factory"
    Project = "nxt-msa"
    Role    = "instructor"
  }
}
