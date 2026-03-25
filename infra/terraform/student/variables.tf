variable "aws_region" {
  description = "AWS 리전"
  type        = string
  default     = "us-east-1"
}

variable "factory_ip" {
  description = "강사가 제공한 공장 서버 IP"
  type        = string
}

variable "key_name" {
  description = "EC2 SSH 키페어 이름"
  type        = string
}

variable "student_name" {
  description = "학생 이름 (리소스 태그용)"
  type        = string
  default     = "student"
}

variable "notification_email" {
  description = "입고 알림 수신 이메일"
  type        = string
  default     = ""
}
