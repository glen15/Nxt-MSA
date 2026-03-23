# Nxt-MSA — 차량 조립 공장 부품 재고 관리 시스템

## 프로젝트 개요
AWS MSA 실습 교재. 차량 조립 공장에서 부품 재고가 임계치 이하로 떨어지면
각 부품 공장에 자동 발주하고, 생산 완료 후 재고를 충전하는 시스템.

## 스택
- 런타임: Node.js 20.x
- 프레임워크: Express
- 프론트엔드: 바닐라 HTML/CSS/JS (S3 정적 호스팅)
- DB: DynamoDB (On-Demand)
- 메시징: SNS + SQS (fan-out)
- 서버리스: Lambda (Node.js 20.x)
- IaC: Terraform (강사용/학생용 분리)
- 컴퓨트: EC2 (t3.micro) — 강사 1대(공장) + 학생 1대(메인앱)

## 프로젝트 컨벤션
- 공장 API는 의도적으로 전부 다르게 설계 (교육 목적)
- SNS 메시지 형식은 통일 (Contract 개념)
- CloudFormation 스택은 번호 순서대로 배포

## 빌드 & 실행
- 설치: `npm install` (각 서비스 디렉토리별)
- 개발: `node src/app.js` (각 서비스별)
- 테스트: 추후 설정
- 강사 배포: `cd infra/terraform/instructor && terraform apply`
- 학생 배포: `cd infra/terraform/student && terraform apply -var="factory_ip=<IP>"`
