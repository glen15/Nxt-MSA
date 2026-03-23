# Lab 08: 전체 통합 (30분)

## 목표
End-to-End 시연 후, 프로덕션 전환 시 추가로 필요한 사항을 토론하고, 리소스를 정리한다.

## Step 1: End-to-End 시연

전체 흐름을 한 번에 실행:

```bash
# 1. 재고 확인
curl -s http://localhost:3000/api/parts | jq '.parts[] | {partId, currentStock, threshold}'

# 2. 하이브리드 SUV 주문 (3개 공장 전부 관련)
curl -s -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"vehicleModel": "suv"}' | jq

# 3. 10초 대기 후 재고 다시 확인
sleep 10
curl -s http://localhost:3000/api/parts | jq '.parts[] | {partId, currentStock, threshold}'

# 4. 발주 현황 확인
curl -s http://localhost:3000/api/purchase-orders | jq
```

브라우저에서 프론트엔드 대시보드를 열어 실시간 변화를 관찰한다.

## Step 2: 아키텍처 복습

```
학생 환경:
  브라우저 → S3 → EC2(메인앱) → DynamoDB
                      ↓
                SNS(발주토픽) ─── 필터 ───┬── SQS(엔진) → Lambda → 강사 엔진공장
                                         ├── SQS(타이어) → Lambda → 강사 타이어공장
                                         └── SQS(배터리) → Lambda → 강사 배터리공장
                                                                     ↓
                                                              SNS(입고토픽)
                                                              ├── SQS(재고) → Lambda → DynamoDB
                                                              ├── SQS(상태) → Lambda → DynamoDB
                                                              └── 이메일 알림
```

## Step 3: 토론 — 프로덕션 전환 시

### 보안
- [ ] API Gateway + API Key
- [ ] VPC 내부 통신 (PrivateLink)
- [ ] WAF

### 관찰성
- [ ] CloudWatch 대시보드
- [ ] X-Ray 트레이싱
- [ ] 알람 (SQS 큐 깊이, DLQ 메시지 수)

### 확장성
- [ ] Auto Scaling Group (EC2)
- [ ] Lambda 동시성 제한
- [ ] SQS 배치 크기 조정

### 데이터
- [ ] DynamoDB 백업 (PITR)
- [ ] S3 버전닝

### 비용
- [ ] Reserved Instance
- [ ] Lambda 메모리 최적화
- [ ] DynamoDB 프로비저닝 용량 전환 검토

## Step 4: (선택) Terraform으로 전체 재구축

지금까지 콘솔로 만든 것을 Terraform 한 줄로!

```bash
cd infra/terraform/student
cp terraform.tfvars.example terraform.tfvars
# terraform.tfvars 편집 (factory_ip, key_name, student_name)
terraform init
terraform plan
terraform apply
```

## Step 5: 리소스 정리

### 콘솔로 만든 리소스
1. Lambda 함수 5개 삭제
2. SQS 큐 10개 삭제 (발주 5 + DLQ 5)
3. SNS 토픽 2개 + 구독 삭제
4. EC2 인스턴스 종료
5. DynamoDB 테이블 3개 삭제
6. S3 버킷 비우기 + 삭제
7. IAM 역할/정책 삭제

### Terraform으로 만든 경우
```bash
terraform destroy
```

> ⚠️ **비용 방지**: 실습 종료 후 반드시 모든 리소스를 삭제하세요!

## 수고하셨습니다! 🎉

### 오늘 배운 것
1. **Loose Coupling** — 공장이 죽어도 메인 앱은 정상
2. **SNS Fan-out + 필터** — 차량 타입별 필요한 공장에만 메시지
3. **어댑터 패턴** — Lambda가 API 차이를 흡수
4. **Eventually Consistent** — 비동기 처리 후 최종 일관성
5. **DLQ + Redrive** — 장애 시 메시지 보존과 복구
6. **Chaos Engineering** — 장애 주입으로 시스템 견고성 검증
