variable "prefix" { type = string }
variable "key_name" { type = string }
variable "subnet_id" { type = string }
variable "security_group_id" { type = string }
variable "aws_region" { type = string }
variable "factory_urls" { type = map(string) }
variable "ordering_topic_arn" { type = string }
variable "receiving_topic_arn" { type = string }
variable "parts_table" { type = string }
variable "orders_table" { type = string }
variable "purchase_orders_table" { type = string }

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

resource "aws_iam_role" "app" {
  name = "${var.prefix}-app-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "app" {
  name = "${var.prefix}-app-policy"
  role = aws_iam_role.app.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:*"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["sns:Publish"]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_instance_profile" "app" {
  name = "${var.prefix}-app-profile"
  role = aws_iam_role.app.name
}

resource "aws_instance" "app" {
  ami                    = data.aws_ami.al2023.id
  instance_type          = "t3.micro"
  key_name               = var.key_name
  subnet_id              = var.subnet_id
  vpc_security_group_ids = [var.security_group_id]
  iam_instance_profile   = aws_iam_instance_profile.app.name

  user_data = base64encode(<<-EOF
    #!/bin/bash
    set -euo pipefail
    dnf install -y nodejs20 git

    mkdir -p /opt/nxt-msa
    cat > /opt/nxt-msa/.env << 'ENVFILE'
    PORT=3000
    AWS_REGION=${var.aws_region}
    ENGINE_FACTORY_URL=${var.factory_urls["engine"]}
    TIRE_FACTORY_URL=${var.factory_urls["tire"]}
    BATTERY_FACTORY_URL=${var.factory_urls["battery"]}
    ORDERING_TOPIC_ARN=${var.ordering_topic_arn}
    RECEIVING_TOPIC_ARN=${var.receiving_topic_arn}
    PARTS_TABLE=${var.parts_table}
    ORDERS_TABLE=${var.orders_table}
    PURCHASE_ORDERS_TABLE=${var.purchase_orders_table}
    ENVFILE

    cat > /etc/systemd/system/main-app.service << 'SERVICE'
    [Unit]
    Description=Main App Server
    After=network.target

    [Service]
    Type=simple
    WorkingDirectory=/opt/nxt-msa/main-app
    EnvironmentFile=/opt/nxt-msa/.env
    ExecStart=/usr/bin/node src/app.js
    Restart=always
    RestartSec=5

    [Install]
    WantedBy=multi-user.target
    SERVICE

    systemctl daemon-reload
  EOF
  )

  tags = {
    Name    = "${var.prefix}-app"
    Project = "nxt-msa"
  }
}

output "public_ip" { value = aws_instance.app.public_ip }
output "instance_id" { value = aws_instance.app.id }
