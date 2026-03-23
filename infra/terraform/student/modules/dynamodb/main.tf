variable "prefix" { type = string }

resource "aws_dynamodb_table" "parts" {
  name         = "${var.prefix}-Parts"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "partId"

  attribute {
    name = "partId"
    type = "S"
  }

  tags = { Project = "nxt-msa" }
}

resource "aws_dynamodb_table" "orders" {
  name         = "${var.prefix}-Orders"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "orderId"

  attribute {
    name = "orderId"
    type = "S"
  }

  tags = { Project = "nxt-msa" }
}

resource "aws_dynamodb_table" "purchase_orders" {
  name         = "${var.prefix}-PurchaseOrders"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "purchaseOrderId"

  attribute {
    name = "purchaseOrderId"
    type = "S"
  }

  tags = { Project = "nxt-msa" }
}

# 시드 데이터 — Parts 테이블 초기 데이터
resource "aws_dynamodb_table_item" "engine" {
  table_name = aws_dynamodb_table.parts.name
  hash_key   = aws_dynamodb_table.parts.hash_key

  item = jsonencode({
    partId        = { S = "ENGINE-V6" }
    partName      = { S = "V6 엔진" }
    category      = { S = "engine" }
    currentStock  = { N = "50" }
    threshold     = { N = "20" }
    orderQuantity = { N = "100" }
    updatedAt     = { S = timestamp() }
  })

  lifecycle { ignore_changes = [item] }
}

resource "aws_dynamodb_table_item" "tire" {
  table_name = aws_dynamodb_table.parts.name
  hash_key   = aws_dynamodb_table.parts.hash_key

  item = jsonencode({
    partId        = { S = "TIRE-R18" }
    partName      = { S = "R18 타이어" }
    category      = { S = "tire" }
    currentStock  = { N = "200" }
    threshold     = { N = "80" }
    orderQuantity = { N = "400" }
    updatedAt     = { S = timestamp() }
  })

  lifecycle { ignore_changes = [item] }
}

resource "aws_dynamodb_table_item" "battery" {
  table_name = aws_dynamodb_table.parts.name
  hash_key   = aws_dynamodb_table.parts.hash_key

  item = jsonencode({
    partId        = { S = "BATTERY-72KWH" }
    partName      = { S = "72kWh 배터리" }
    category      = { S = "battery" }
    currentStock  = { N = "30" }
    threshold     = { N = "10" }
    orderQuantity = { N = "50" }
    updatedAt     = { S = timestamp() }
  })

  lifecycle { ignore_changes = [item] }
}

output "parts_table_name" { value = aws_dynamodb_table.parts.name }
output "parts_table_arn" { value = aws_dynamodb_table.parts.arn }
output "orders_table_name" { value = aws_dynamodb_table.orders.name }
output "orders_table_arn" { value = aws_dynamodb_table.orders.arn }
output "purchase_orders_table_name" { value = aws_dynamodb_table.purchase_orders.name }
output "purchase_orders_table_arn" { value = aws_dynamodb_table.purchase_orders.arn }
