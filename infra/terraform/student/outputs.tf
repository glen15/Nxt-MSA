output "app_url" {
  description = "메인 앱서버 URL"
  value       = "http://${module.ec2.public_ip}:3000"
}

output "frontend_url" {
  description = "프론트엔드 S3 URL"
  value       = module.s3.website_url
}

output "app_public_ip" {
  description = "메인 앱서버 IP"
  value       = module.ec2.public_ip
}

output "ordering_topic_arn" {
  description = "발주 SNS 토픽 ARN"
  value       = module.messaging.ordering_topic_arn
}

output "receiving_topic_arn" {
  description = "입고 SNS 토픽 ARN"
  value       = module.messaging.receiving_topic_arn
}
