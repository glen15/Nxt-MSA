variable "prefix" { type = string }
variable "factory_ip" { type = string }

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

resource "aws_security_group" "app" {
  name        = "${var.prefix}-app-sg"
  description = "Main app server security group"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Main App"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "${var.prefix}-app-sg"
    Project = "nxt-msa"
  }
}

output "subnet_id" {
  value = data.aws_subnets.default.ids[0]
}

output "app_sg_id" {
  value = aws_security_group.app.id
}

output "vpc_id" {
  value = data.aws_vpc.default.id
}
