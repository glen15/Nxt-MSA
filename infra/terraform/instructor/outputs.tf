output "factory_public_ip" {
  description = "공장 서버 퍼블릭 IP — 학생들에게 전달"
  value       = aws_instance.factory.public_ip
}

output "factory_public_dns" {
  description = "공장 서버 퍼블릭 DNS"
  value       = aws_instance.factory.public_dns
}

output "engine_factory_url" {
  description = "엔진 공장 URL"
  value       = "http://${aws_instance.factory.public_ip}:3001"
}

output "tire_factory_url" {
  description = "타이어 공장 URL"
  value       = "http://${aws_instance.factory.public_ip}:3002"
}

output "battery_factory_url" {
  description = "배터리 공장 URL"
  value       = "http://${aws_instance.factory.public_ip}:3003"
}

output "student_env_vars" {
  description = "학생 환경변수 (복사해서 전달)"
  value       = <<-EOT
    ENGINE_FACTORY_URL=http://${aws_instance.factory.public_ip}:3001
    TIRE_FACTORY_URL=http://${aws_instance.factory.public_ip}:3002
    BATTERY_FACTORY_URL=http://${aws_instance.factory.public_ip}:3003
  EOT
}
