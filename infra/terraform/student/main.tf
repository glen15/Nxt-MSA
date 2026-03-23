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

locals {
  prefix = "nxt-msa-${var.student_name}"
  factory_urls = {
    engine  = "http://${var.factory_ip}:3001"
    tire    = "http://${var.factory_ip}:3002"
    battery = "http://${var.factory_ip}:3003"
  }
}

module "networking" {
  source      = "./modules/networking"
  prefix      = local.prefix
  factory_ip  = var.factory_ip
}

module "dynamodb" {
  source = "./modules/dynamodb"
  prefix = local.prefix
}

module "messaging" {
  source             = "./modules/messaging"
  prefix             = local.prefix
  notification_email = var.notification_email
}

module "lambda" {
  source                = "./modules/lambda"
  prefix                = local.prefix
  aws_region            = var.aws_region
  factory_urls          = local.factory_urls
  parts_table           = module.dynamodb.parts_table_name
  purchase_orders_table = module.dynamodb.purchase_orders_table_name
  engine_queue_arn      = module.messaging.engine_queue_arn
  tire_queue_arn        = module.messaging.tire_queue_arn
  battery_queue_arn     = module.messaging.battery_queue_arn
  stock_queue_arn       = module.messaging.stock_queue_arn
  order_status_queue_arn = module.messaging.order_status_queue_arn
}

module "ec2" {
  source              = "./modules/ec2"
  prefix              = local.prefix
  key_name            = var.key_name
  subnet_id           = module.networking.subnet_id
  security_group_id   = module.networking.app_sg_id
  aws_region          = var.aws_region
  factory_urls        = local.factory_urls
  ordering_topic_arn  = module.messaging.ordering_topic_arn
  receiving_topic_arn = module.messaging.receiving_topic_arn
  parts_table         = module.dynamodb.parts_table_name
  orders_table        = module.dynamodb.orders_table_name
  purchase_orders_table = module.dynamodb.purchase_orders_table_name
}

module "s3" {
  source     = "./modules/s3"
  prefix     = local.prefix
  api_url    = "http://${module.ec2.public_ip}:3000"
}
