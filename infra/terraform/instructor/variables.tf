variable "aws_region" {
  description = "AWS 리전"
  type        = string
  default     = "ap-northeast-2"
}

variable "key_name" {
  description = "EC2 SSH 키페어 이름"
  type        = string
}

variable "allowed_cidrs" {
  description = "공장 서버에 접근 가능한 CIDR 블록 (학생 IP 대역)"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "instance_type" {
  description = "EC2 인스턴스 타입"
  type        = string
  default     = "t3.micro"
}

variable "receiving_topic_arn" {
  description = "입고 완료 SNS 토픽 ARN (학생이 생성 후 전달)"
  type        = string
  default     = ""
}
