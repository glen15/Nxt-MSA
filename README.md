# Nxt-MSA — 차량 조립 공장 부품 재고 관리 시스템

AWS 마이크로서비스 아키텍처(MSA) 실습 교재.

차량 조립 공장에서 부품(엔진, 타이어, 배터리) 재고가 임계치 이하로 떨어지면 각 부품 공장에 자동 발주하고, 생산 완료 후 재고를 충전하는 시스템.

## 아키텍처

```
브라우저 → S3 → EC2(메인앱) → DynamoDB
                     ↓
               SNS(발주토픽) ── 필터 ──┬── SQS → Lambda → 엔진 공장 (:3001)
                                      ├── SQS → Lambda → 타이어 공장 (:3002)
                                      └── SQS → Lambda → 배터리 공장 (:3003)
                                                              ↓
                                                       SNS(입고토픽)
                                                       ├── SQS → Lambda → 재고 충전
                                                       ├── SQS → Lambda → 상태 업데이트
                                                       └── 이메일 알림
```

## 차량 타입별 부품

| 차량 | 모델 | 엔진 | 타이어 | 배터리 |
|------|------|:----:|:------:|:------:|
| 내연기관 세단 | `sedan` | 1 | 4 | - |
| 전기차 | `ev` | - | 4 | 2 |
| 하이브리드 SUV | `suv` | 1 | 4 | 1 |

## 교육 목표

1. **Loose Coupling** — 공장 다운 → 큐 적체 → 메인 앱 정상
2. **SNS Fan-out + 필터** — 차량 타입별 필요 공장에만 메시지
3. **어댑터 패턴** — Lambda가 공장별 다른 API 차이를 흡수
4. **Eventually Consistent** — 비동기 처리 후 최종 일관성
5. **Chaos Engineering** — 장애 주입 API로 장애 시나리오 체험
6. **DLQ + Redrive** — 장애 시 메시지 보존과 복구

## 프로젝트 구조

```
Nxt-MSA/
├── main-app/              # 메인 앱서버 (Express + DynamoDB)
├── frontend/              # 프론트엔드 (바닐라 HTML/CSS/JS)
├── factories/             # 부품 공장 3개 (강사용)
│   ├── shared/            # 공통 모듈 (장애 주입, SNS)
│   ├── engine-factory/    # :3001 — POST /api/produce
│   ├── tire-factory/      # :3002 — POST /api/manufacture
│   └── battery-factory/   # :3003 — POST /api/orders
├── lambdas/               # Lambda 함수 5개
│   ├── order-engine/      # 발주 → 엔진 공장
│   ├── order-tire/        # 발주 → 타이어 공장
│   ├── order-battery/     # 발주 → 배터리 공장
│   ├── receive-stock/     # 입고 → 재고 충전
│   └── update-order-status/ # 입고 → 상태 업데이트
├── infra/terraform/       # IaC
│   ├── instructor/        # 강사용 (공장 EC2)
│   └── student/           # 학생용 (전체 인프라)
├── docs/labs/             # 실습 문서 9개
└── PLAN.md                # 상세 설계 문서
```

## 빠른 시작

### 강사
```bash
cd infra/terraform/instructor
cp terraform.tfvars.example terraform.tfvars
# terraform.tfvars 편집
terraform init && terraform apply
# → factory_public_ip 확인 → 학생에게 전달
```

### 학생 (로컬 개발)
```bash
cd main-app
npm install

export ENGINE_FACTORY_URL=http://<강사IP>:3001
export TIRE_FACTORY_URL=http://<강사IP>:3002
export BATTERY_FACTORY_URL=http://<강사IP>:3003

npm start
# → http://localhost:3000
```

### 학생 (Terraform 전체 배포)
```bash
cd infra/terraform/student
cp terraform.tfvars.example terraform.tfvars
# terraform.tfvars 편집 (factory_ip 필수)
terraform init && terraform apply
```

## 실습 순서

| Lab | 제목 | 시간 |
|-----|------|------|
| [00](docs/labs/lab-00-environment-setup.md) | 환경 설정 | 30분 |
| [01](docs/labs/lab-01-dynamodb-and-main-app.md) | DynamoDB + 메인 앱 | 60분 |
| [02](docs/labs/lab-02-s3-frontend.md) | S3 프론트엔드 | 30분 |
| [03](docs/labs/lab-03-factory-api.md) | 공장 API 탐험 | 30분 |
| [04](docs/labs/lab-04-sns-sqs-ordering.md) | SNS + SQS 발주 경로 | 60분 |
| [05](docs/labs/lab-05-lambda-connectors.md) | Lambda 커넥터 | 60분 |
| [06](docs/labs/lab-06-receiving-path.md) | 입고 경로 | 45분 |
| [07](docs/labs/lab-07-chaos-and-recovery.md) | 장애와 복구 | 45분 |
| [08](docs/labs/lab-08-full-integration.md) | 전체 통합 | 30분 |

총 약 **6.5시간**

## 기술 스택

- **런타임**: Node.js 20.x + Express
- **프론트엔드**: 바닐라 HTML/CSS/JS
- **DB**: DynamoDB (On-Demand)
- **메시징**: SNS + SQS
- **서버리스**: Lambda
- **IaC**: Terraform
- **호스팅**: S3 정적 웹사이트, EC2 (t3.micro)
