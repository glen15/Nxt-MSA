variable "prefix" { type = string }
variable "aws_region" { type = string }
variable "factory_urls" { type = map(string) }
variable "parts_table" { type = string }
variable "purchase_orders_table" { type = string }
variable "engine_queue_arn" { type = string }
variable "tire_queue_arn" { type = string }
variable "battery_queue_arn" { type = string }
variable "stock_queue_arn" { type = string }
variable "order_status_queue_arn" { type = string }

# Lambda 실행 역할
resource "aws_iam_role" "lambda" {
  name = "${var.prefix}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })

  tags = { Project = "nxt-msa" }
}

resource "aws_iam_role_policy" "lambda" {
  name = "${var.prefix}-lambda-policy"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = [
          var.engine_queue_arn,
          var.tire_queue_arn,
          var.battery_queue_arn,
          var.stock_queue_arn,
          var.order_status_queue_arn
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["dynamodb:UpdateItem", "dynamodb:GetItem"]
        Resource = "*"
      }
    ]
  })
}

# --- 발주 Lambda 3개 ---

# 더미 ZIP (실제 배포 시 lambdas/ 코드를 ZIP으로 패키징)
data "archive_file" "order_engine" {
  type        = "zip"
  source_dir  = "${path.module}/../../../../lambdas/order-engine"
  output_path = "${path.module}/.build/order-engine.zip"
}

data "archive_file" "order_tire" {
  type        = "zip"
  source_dir  = "${path.module}/../../../../lambdas/order-tire"
  output_path = "${path.module}/.build/order-tire.zip"
}

data "archive_file" "order_battery" {
  type        = "zip"
  source_dir  = "${path.module}/../../../../lambdas/order-battery"
  output_path = "${path.module}/.build/order-battery.zip"
}

data "archive_file" "receive_stock" {
  type        = "zip"
  source_dir  = "${path.module}/../../../../lambdas/receive-stock"
  output_path = "${path.module}/.build/receive-stock.zip"
}

data "archive_file" "update_order_status" {
  type        = "zip"
  source_dir  = "${path.module}/../../../../lambdas/update-order-status"
  output_path = "${path.module}/.build/update-order-status.zip"
}

resource "aws_lambda_function" "order_engine" {
  function_name    = "${var.prefix}-order-engine"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 30
  filename         = data.archive_file.order_engine.output_path
  source_code_hash = data.archive_file.order_engine.output_base64sha256

  environment {
    variables = {
      ENGINE_FACTORY_URL = var.factory_urls["engine"]
    }
  }

  tags = { Project = "nxt-msa" }
}

resource "aws_lambda_function" "order_tire" {
  function_name    = "${var.prefix}-order-tire"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 30
  filename         = data.archive_file.order_tire.output_path
  source_code_hash = data.archive_file.order_tire.output_base64sha256

  environment {
    variables = {
      TIRE_FACTORY_URL = var.factory_urls["tire"]
    }
  }

  tags = { Project = "nxt-msa" }
}

resource "aws_lambda_function" "order_battery" {
  function_name    = "${var.prefix}-order-battery"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 30
  filename         = data.archive_file.order_battery.output_path
  source_code_hash = data.archive_file.order_battery.output_base64sha256

  environment {
    variables = {
      BATTERY_FACTORY_URL = var.factory_urls["battery"]
    }
  }

  tags = { Project = "nxt-msa" }
}

resource "aws_lambda_function" "receive_stock" {
  function_name    = "${var.prefix}-receive-stock"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 10
  filename         = data.archive_file.receive_stock.output_path
  source_code_hash = data.archive_file.receive_stock.output_base64sha256

  environment {
    variables = {
      PARTS_TABLE = var.parts_table
    }
  }

  tags = { Project = "nxt-msa" }
}

resource "aws_lambda_function" "update_order_status" {
  function_name    = "${var.prefix}-update-order-status"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 10
  filename         = data.archive_file.update_order_status.output_path
  source_code_hash = data.archive_file.update_order_status.output_base64sha256

  environment {
    variables = {
      PURCHASE_ORDERS_TABLE = var.purchase_orders_table
    }
  }

  tags = { Project = "nxt-msa" }
}

# SQS → Lambda 이벤트 소스 매핑
resource "aws_lambda_event_source_mapping" "engine" {
  event_source_arn = var.engine_queue_arn
  function_name    = aws_lambda_function.order_engine.arn
  batch_size       = 1
}

resource "aws_lambda_event_source_mapping" "tire" {
  event_source_arn = var.tire_queue_arn
  function_name    = aws_lambda_function.order_tire.arn
  batch_size       = 1
}

resource "aws_lambda_event_source_mapping" "battery" {
  event_source_arn = var.battery_queue_arn
  function_name    = aws_lambda_function.order_battery.arn
  batch_size       = 1
}

resource "aws_lambda_event_source_mapping" "stock" {
  event_source_arn = var.stock_queue_arn
  function_name    = aws_lambda_function.receive_stock.arn
  batch_size       = 1
}

resource "aws_lambda_event_source_mapping" "order_status" {
  event_source_arn = var.order_status_queue_arn
  function_name    = aws_lambda_function.update_order_status.arn
  batch_size       = 1
}
