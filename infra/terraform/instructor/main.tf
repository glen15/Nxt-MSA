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

# 최신 Amazon Linux 2023 AMI
data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
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

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
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
    description = "Engine Factory"
    from_port   = 3001
    to_port     = 3001
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidrs
  }

  ingress {
    description = "Tire Factory"
    from_port   = 3002
    to_port     = 3002
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidrs
  }

  ingress {
    description = "Battery Factory"
    from_port   = 3003
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

# EC2 인스턴스 — 공장 서버 3개 (포트 3001/3002/3003)
resource "aws_instance" "factory" {
  ami                    = data.aws_ami.al2023.id
  instance_type          = var.instance_type
  key_name               = var.key_name
  vpc_security_group_ids = [aws_security_group.factory.id]
  iam_instance_profile   = aws_iam_instance_profile.factory.name
  subnet_id              = data.aws_subnets.default.ids[0]

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
