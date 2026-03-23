variable "prefix" { type = string }
variable "notification_email" { type = string }

# === 발주 경로 ===

resource "aws_sns_topic" "ordering" {
  name = "${var.prefix}-parts-ordering"
  tags = { Project = "nxt-msa" }
}

# 엔진 발주 큐 + DLQ
resource "aws_sqs_queue" "engine_dlq" {
  name = "${var.prefix}-engine-order-dlq"
  tags = { Project = "nxt-msa" }
}

resource "aws_sqs_queue" "engine" {
  name = "${var.prefix}-engine-order"
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.engine_dlq.arn
    maxReceiveCount     = 3
  })
  tags = { Project = "nxt-msa" }
}

# 타이어 발주 큐 + DLQ
resource "aws_sqs_queue" "tire_dlq" {
  name = "${var.prefix}-tire-order-dlq"
  tags = { Project = "nxt-msa" }
}

resource "aws_sqs_queue" "tire" {
  name = "${var.prefix}-tire-order"
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.tire_dlq.arn
    maxReceiveCount     = 3
  })
  tags = { Project = "nxt-msa" }
}

# 배터리 발주 큐 + DLQ
resource "aws_sqs_queue" "battery_dlq" {
  name = "${var.prefix}-battery-order-dlq"
  tags = { Project = "nxt-msa" }
}

resource "aws_sqs_queue" "battery" {
  name = "${var.prefix}-battery-order"
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.battery_dlq.arn
    maxReceiveCount     = 3
  })
  tags = { Project = "nxt-msa" }
}

# SNS → SQS 구독 (필터 정책 포함)
resource "aws_sns_topic_subscription" "engine" {
  topic_arn     = aws_sns_topic.ordering.arn
  protocol      = "sqs"
  endpoint      = aws_sqs_queue.engine.arn
  filter_policy = jsonencode({ category = ["engine"] })
}

resource "aws_sns_topic_subscription" "tire" {
  topic_arn     = aws_sns_topic.ordering.arn
  protocol      = "sqs"
  endpoint      = aws_sqs_queue.tire.arn
  filter_policy = jsonencode({ category = ["tire"] })
}

resource "aws_sns_topic_subscription" "battery" {
  topic_arn     = aws_sns_topic.ordering.arn
  protocol      = "sqs"
  endpoint      = aws_sqs_queue.battery.arn
  filter_policy = jsonencode({ category = ["battery"] })
}

# SQS 정책 — SNS가 메시지 보낼 수 있도록
resource "aws_sqs_queue_policy" "engine" {
  queue_url = aws_sqs_queue.engine.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "sns.amazonaws.com" }
      Action    = "sqs:SendMessage"
      Resource  = aws_sqs_queue.engine.arn
      Condition = { ArnEquals = { "aws:SourceArn" = aws_sns_topic.ordering.arn } }
    }]
  })
}

resource "aws_sqs_queue_policy" "tire" {
  queue_url = aws_sqs_queue.tire.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "sns.amazonaws.com" }
      Action    = "sqs:SendMessage"
      Resource  = aws_sqs_queue.tire.arn
      Condition = { ArnEquals = { "aws:SourceArn" = aws_sns_topic.ordering.arn } }
    }]
  })
}

resource "aws_sqs_queue_policy" "battery" {
  queue_url = aws_sqs_queue.battery.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "sns.amazonaws.com" }
      Action    = "sqs:SendMessage"
      Resource  = aws_sqs_queue.battery.arn
      Condition = { ArnEquals = { "aws:SourceArn" = aws_sns_topic.ordering.arn } }
    }]
  })
}

# === 입고 경로 ===

resource "aws_sns_topic" "receiving" {
  name = "${var.prefix}-parts-receiving"
  tags = { Project = "nxt-msa" }
}

# 재고 충전 큐 + DLQ
resource "aws_sqs_queue" "stock_dlq" {
  name = "${var.prefix}-stock-dlq"
  tags = { Project = "nxt-msa" }
}

resource "aws_sqs_queue" "stock" {
  name = "${var.prefix}-stock"
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.stock_dlq.arn
    maxReceiveCount     = 3
  })
  tags = { Project = "nxt-msa" }
}

# 주문 상태 업데이트 큐 + DLQ
resource "aws_sqs_queue" "order_status_dlq" {
  name = "${var.prefix}-order-status-dlq"
  tags = { Project = "nxt-msa" }
}

resource "aws_sqs_queue" "order_status" {
  name = "${var.prefix}-order-status"
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.order_status_dlq.arn
    maxReceiveCount     = 3
  })
  tags = { Project = "nxt-msa" }
}

# 입고 토픽 → SQS 구독
resource "aws_sns_topic_subscription" "stock" {
  topic_arn = aws_sns_topic.receiving.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.stock.arn
}

resource "aws_sns_topic_subscription" "order_status" {
  topic_arn = aws_sns_topic.receiving.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.order_status.arn
}

# 이메일 알림 구독 (옵션)
resource "aws_sns_topic_subscription" "email" {
  count     = var.notification_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.receiving.arn
  protocol  = "email"
  endpoint  = var.notification_email
}

# 입고 SQS 정책
resource "aws_sqs_queue_policy" "stock" {
  queue_url = aws_sqs_queue.stock.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "sns.amazonaws.com" }
      Action    = "sqs:SendMessage"
      Resource  = aws_sqs_queue.stock.arn
      Condition = { ArnEquals = { "aws:SourceArn" = aws_sns_topic.receiving.arn } }
    }]
  })
}

resource "aws_sqs_queue_policy" "order_status" {
  queue_url = aws_sqs_queue.order_status.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "sns.amazonaws.com" }
      Action    = "sqs:SendMessage"
      Resource  = aws_sqs_queue.order_status.arn
      Condition = { ArnEquals = { "aws:SourceArn" = aws_sns_topic.receiving.arn } }
    }]
  })
}

# Outputs
output "ordering_topic_arn" { value = aws_sns_topic.ordering.arn }
output "receiving_topic_arn" { value = aws_sns_topic.receiving.arn }
output "engine_queue_arn" { value = aws_sqs_queue.engine.arn }
output "tire_queue_arn" { value = aws_sqs_queue.tire.arn }
output "battery_queue_arn" { value = aws_sqs_queue.battery.arn }
output "stock_queue_arn" { value = aws_sqs_queue.stock.arn }
output "order_status_queue_arn" { value = aws_sqs_queue.order_status.arn }
