# 차량 조립 공장 부품 재고 관리 시스템 — MSA 실습

## 시나리오 개요

차량 조립 공장에서 부품(엔진, 타이어, 배터리) 재고가 임계치 이하로 떨어지면
각 부품 공장에 자동 발주하고, 생산 완료 후 재고를 충전하는 시스템.

차량 타입(내연기관/전기차/하이브리드)에 따라 필요한 부품이 달라
각기 다른 공장에 발주가 나간다.

### 교육 목표
1. **Loose Coupling** — 공장 다운 → 큐 적체 → 메인 앱 정상 동작
2. **SNS fan-out + 필터링** — 차량 타입에 따라 필요한 공장에만 메시지 전달
3. **API 기반 서비스 간 통신** — 공장별 다른 API 스펙 처리
4. **Eventually Consistent** — 비동기 처리 후 최종 일관성
5. **장애 복구** — 서버 복구 시 밀린 메시지 자동 소비
6. **Chaos Engineering** — 장애 주입 API로 다양한 장애 시나리오 체험

---

## 아키텍처

### 운영 구조

- **강사**: 공장 서버 EC2 1대 (포트 3001/3002/3003) — 사전 배포, 장애 주입 제어
- **학생**: 각자 메인 앱 EC2 1대 + DynamoDB + SNS/SQS + Lambda 구성

### 메인 경로 (동기)
```
Client → S3(프론트엔드) → EC2(학생 앱서버) → DynamoDB
```

### 발주 경로 (비동기)
```
EC2 앱서버 → SNS(부품 발주 토픽)
                ├→ SQS(엔진큐)   → Lambda → 강사 엔진 공장 API (:3001)
                ├→ SQS(타이어큐) → Lambda → 강사 타이어 공장 API (:3002)
                └→ SQS(배터리큐) → Lambda → 강사 배터리 공장 API (:3003)
```

발주는 차량 타입에 따라 필요한 공장에만 나간다:
```
내연기관(sedan) 주문 → 엔진큐 + 타이어큐 (배터리 불필요)
전기차(ev) 주문     → 배터리큐 + 타이어큐 (엔진 불필요)
하이브리드(suv) 주문 → 엔진큐 + 타이어큐 + 배터리큐 (전부 필요)
```

### 입고 경로 (비동기)
```
강사 공장 생산 완료 → SNS(입고 완료 토픽)
                       ├→ SQS(재고큐)     → Lambda → DynamoDB 재고 충전
                       ├→ SQS(주문상태큐) → Lambda → 주문 상태 업데이트
                       └→ 이메일 구독      → 입고 알림
```

---

## 레포지토리 구조

```
Nxt-MSA/
├── docs/
│   ├── architecture/
│   │   ├── system-architecture.md
│   │   └── diagrams/
│   ├── api/
│   │   ├── main-app-api.md
│   │   ├── engine-factory-api.md
│   │   ├── tire-factory-api.md
│   │   └── battery-factory-api.md
│   └── labs/
│       ├── lab-00-environment-setup.md
│       ├── lab-01-dynamodb-and-main-app.md
│       ├── lab-02-s3-frontend.md
│       ├── lab-03-factory-servers.md
│       ├── lab-04-sns-sqs-ordering.md
│       ├── lab-05-lambda-connectors.md
│       ├── lab-06-receiving-path.md
│       ├── lab-07-chaos-and-recovery.md
│       └── lab-08-full-integration.md
│
├── infra/
│   └── terraform/
│       ├── instructor/              # 강사용 — 공장 서버만
│       │   ├── main.tf
│       │   ├── variables.tf
│       │   ├── outputs.tf           # factory_public_ip 출력
│       │   └── terraform.tfvars
│       │
│       └── student/                 # 학생용 — 메인 앱 + AWS 서비스 전체
│           ├── main.tf
│           ├── variables.tf         # factory_ip 입력 받음
│           ├── outputs.tf
│           └── modules/
│               ├── networking/      # VPC, Subnet, SG
│               ├── dynamodb/        # 3테이블 + 시드 데이터
│               ├── ec2/             # 메인 앱서버 1대
│               ├── messaging/       # SNS 2개, SQS 5개, DLQ 5개
│               ├── lambda/          # Lambda 5개 + SQS 이벤트 소스
│               └── s3/              # 프론트엔드 정적 호스팅
│
├── main-app/                    # EC2 메인 앱서버
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── models/
│   │   └── app.js
│   ├── package.json
│   └── Dockerfile
│
├── frontend/                    # S3 정적 호스팅
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── assets/
│
├── factories/                   # 부품 공장 3개 (별도 서버)
│   ├── engine-factory/
│   │   ├── src/
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── tire-factory/
│   │   ├── src/
│   │   ├── package.json
│   │   └── Dockerfile
│   └── battery-factory/
│       ├── src/
│       ├── package.json
│       └── Dockerfile
│
├── lambdas/                     # Lambda 함수 5개
│   ├── order-engine/            # 발주 → 엔진 공장 호출
│   │   ├── index.js
│   │   └── package.json
│   ├── order-tire/              # 발주 → 타이어 공장 호출
│   │   ├── index.js
│   │   └── package.json
│   ├── order-battery/           # 발주 → 배터리 공장 호출
│   │   ├── index.js
│   │   └── package.json
│   ├── receive-stock/           # 입고 → DynamoDB 재고 충전
│   │   ├── index.js
│   │   └── package.json
│   └── update-order-status/     # 입고 → 주문 상태 업데이트
│       ├── index.js
│       └── package.json
│
├── PLAN.md
└── README.md
```

---

## 기술 스택

| 구성 요소 | 기술 | 선택 근거 |
|-----------|------|-----------|
| 프론트엔드 | 바닐라 HTML/CSS/JS | 프레임워크 학습 부담 제거 |
| 메인 앱서버 | Node.js + Express | 수강생 대부분 JS 경험 있음 |
| 부품 공장 3개 | Node.js + Express | 동일 런타임으로 인지 부하 최소화 |
| Lambda | Node.js 20.x | 동일 런타임 통일 |
| DB | DynamoDB (On-Demand) | 관리형 서비스, 비용 최소화 |
| 메시징 | SNS + SQS | fan-out 패턴 실습 |
| 프론트엔드 호스팅 | S3 정적 웹사이트 | CloudFront 없이 단순화 |
| IaC | Terraform | 강사용/학생용 분리 배포, 모듈화 학습 |

---

## DynamoDB 테이블 설계

### Parts (부품 재고)

| 속성 | 타입 | 역할 |
|------|------|------|
| `partId` (PK) | String | `ENGINE-V6`, `TIRE-R18`, `BATTERY-72KWH` |
| `partName` | String | 부품 한글명 |
| `category` | String | `engine` / `tire` / `battery` |
| `currentStock` | Number | 현재 재고 수량 |
| `threshold` | Number | 발주 임계치 |
| `orderQuantity` | Number | 1회 발주 수량 |
| `factoryEndpoint` | String | 공장 API 엔드포인트 |
| `updatedAt` | String (ISO 8601) | 최종 갱신 시각 |

초기 데이터:
- `ENGINE-V6`: 현재 50개, 임계치 20, 발주량 100
- `TIRE-R18`: 현재 200개, 임계치 80, 발주량 400 (차량 1대당 4개)
- `BATTERY-72KWH`: 현재 30개, 임계치 10, 발주량 50

### 차량 타입별 필요 부품

| 차량 타입 | vehicleModel | ENGINE-V6 | TIRE-R18 | BATTERY-72KWH | 교육 포인트 |
|-----------|-------------|-----------|----------|---------------|------------|
| 내연기관 | `sedan` | 1 | 4 | 0 | 배터리 공장에 발주 안 나감 |
| 전기차 | `ev` | 0 | 4 | 2 | 엔진 공장에 발주 안 나감 |
| 하이브리드 | `suv` | 1 | 4 | 1 | 3개 공장 전부에 발주 |

교육 포인트: 같은 "차량 주문"이지만 타입에 따라 다른 공장에 메시지가 나간다
→ SNS 필터링의 실질적 필요성 체험

### Orders (차량 주문)

| 속성 | 타입 | 역할 |
|------|------|------|
| `orderId` (PK) | String | UUID |
| `vehicleModel` | String | `sedan` (내연기관), `ev` (전기차), `suv` (하이브리드) |
| `vehicleType` | String | `ice` / `ev` / `hybrid` |
| `status` | String | `RECEIVED` → `PARTS_ALLOCATED` → `ASSEMBLING` → `COMPLETED` / `WAITING_PARTS` |
| `requiredParts` | Map | 차량 타입에 따라 다름 (아래 참조) |
| `missingParts` | Map | 부족한 부품과 수량 |
| `createdAt` | String (ISO 8601) | |
| `updatedAt` | String (ISO 8601) | |

### PurchaseOrders (부품 발주)

| 속성 | 타입 | 역할 |
|------|------|------|
| `purchaseOrderId` (PK) | String | UUID |
| `partId` | String | 어떤 부품의 발주인가 |
| `quantity` | Number | 발주 수량 |
| `status` | String | `ORDERED` → `PRODUCING` → `SHIPPED` → `RECEIVED` / `FAILED` |
| `factoryResponse` | Map | 공장 API 응답 저장 |
| `orderedAt` | String (ISO 8601) | |
| `completedAt` | String (ISO 8601) | |

---

## 공장 API 스펙 (의도적으로 전부 다르게 설계)

### 엔진 공장 (`:3001`)

```
POST /api/produce
Body: { purchaseOrderId, partId, quantity, callbackTopicArn }
→ 202: { factoryOrderId: "ENG-...", estimatedMinutes: 3, message: "엔진 생산을 시작합니다" }

GET /api/status/:factoryOrderId
→ 200: { factoryOrderId, status: "PRODUCING" | "COMPLETED" | "FAILED", progress: 65 }

GET /api/health
→ 200: { status: "running", queuedOrders: 3 }
```

### 타이어 공장 (`:3002`)

```
POST /api/manufacture
Body: { purchaseOrderId, partId, quantity, callbackTopicArn }
→ 202: { jobId: "TIR-...", eta: "2026-03-23T15:30:00Z", status: "queued" }

GET /api/jobs/:jobId
→ 200: { jobId, status: "queued" | "in_progress" | "done" | "error" }

GET /api/health
→ 200: { healthy: true, pendingJobs: 5 }
```

### 배터리 공장 (`:3003`)

```
POST /api/orders
Body: { purchaseOrderId, partId, quantity, callbackTopicArn }
→ 200: { orderNumber: "BAT-...", productionTimeSeconds: 180, note: "위험물 추가 검수 필요" }

POST /api/orders/status          ← GET이 아닌 POST (의도적)
Body: { orderNumber: "BAT-001" }
→ 200: { orderNumber, phase: "charging" | "testing" | "packaging" | "ready" }

GET /api/ping                    ← /health가 아닌 /ping
→ 200: { alive: true }
```

### 장애 주입 API (3개 공장 공통, 강사 전용)

```
POST /admin/chaos
Body: {
  "type": "shutdown" | "delay" | "error-rate",
  "durationSeconds": 60,     // shutdown/delay 지속 시간
  "delayMs": 30000,           // delay 모드: 응답 지연 (ms)
  "errorRate": 0.5            // error-rate 모드: 실패 확률 (0~1)
}
→ 200: { enabled: true, type: "delay", until: "2026-03-23T15:31:00Z" }

DELETE /admin/chaos
→ 200: { enabled: false, message: "정상 복구" }

GET /admin/chaos
→ 200: { enabled: true/false, type: "...", remaining: 45 }
```

장애 시나리오:
- `shutdown`: 모든 생산 요청에 503 응답 → SQS 적체 + DLQ 체험
- `delay`: 응답 30초 지연 → Lambda 타임아웃 체험
- `error-rate`: 50% 확률 500 에러 → 부분 실패 + 재시도 체험

### SNS 발행 메시지 (공장 → 입고 토픽, 형식 통일)

```json
{
  "purchaseOrderId": "uuid",
  "partId": "ENGINE-V6",
  "quantity": 100,
  "factory": "engine",
  "completedAt": "2026-03-23T15:35:00Z",
  "status": "COMPLETED"
}
```
교육 포인트: API 형식은 제각각이지만 SNS 메시지는 통일 → "계약(Contract)의 중요성"

---

## SNS 필터 정책

발주 토픽 → SQS 구독 시 메시지 필터링:
```
engine-order-queue:  { "category": ["engine"] }
tire-order-queue:    { "category": ["tire"] }
battery-order-queue: { "category": ["battery"] }
```

---

## AWS 리소스 목록

| 카테고리 | 리소스 | 수량 | 용도 |
|----------|--------|------|------|
| Compute | EC2 (t3.micro) | 1대 (학생) | 메인 앱서버 |
| Compute | EC2 (t3.micro) | 1대 (강사) | 공장 서버 3개 (포트 3001/3002/3003) |
| Storage | S3 Bucket | 1개 | 프론트엔드 정적 호스팅 |
| Database | DynamoDB Table | 3개 | Parts, Orders, PurchaseOrders |
| Messaging | SNS Topic | 2개 | parts-ordering-topic, parts-receiving-topic |
| Messaging | SQS Queue | 5개 | 발주 3개 + 입고 2개 |
| Messaging | SQS DLQ | 5개 | 각 SQS 대응 Dead Letter Queue |
| Compute | Lambda Function | 5개 | 발주 커넥터 3 + 입고 처리 2 |
| IAM | Role | 3개 | EC2, Lambda, S3 |
| Networking | VPC, Subnet, SG | 기본 | EC2 간 통신, 인터넷 접근 |
| Monitoring | SNS Subscription (email) | 1개 | 입고 알림 |

### Terraform 배포 흐름

**강사 먼저:**
```
cd infra/terraform/instructor
terraform apply
→ 공장 EC2 1대 (포트 3001/3002/3003) 배포
→ Output: factory_public_ip = "3.x.x.x"
```

**학생 (콘솔 실습 후 or 직접):**
```
cd infra/terraform/student
terraform apply -var="factory_ip=3.x.x.x"
→ VPC + DynamoDB + EC2 + SNS/SQS + Lambda + S3 전체 배포
```

---

## 실습 단계 (Labs)

### Lab 00: 환경 설정 (30분)
- AWS CLI, IAM 사용자, Node.js, 리포 클론

### Lab 01: DynamoDB + 메인 앱 (60분)
- CloudFormation으로 DynamoDB 생성
- 메인 앱 로컬 실행 → 주문 생성 → 재고 차감 확인

### Lab 02: S3 프론트엔드 (30분)
- S3 정적 호스팅 → 브라우저에서 API 호출

### Lab 03: 공장 API 탐험 (30분)
- 강사가 미리 띄워둔 공장 서버 3개의 API를 curl로 호출
- **핵심 체험**: 같은 "생산 요청"인데 엔드포인트·응답 형식·상태코드가 전부 다름
- 내연기관(sedan) 주문 vs 전기차(ev) 주문 → 필요한 공장이 다름을 확인

### Lab 04: SNS + SQS 발주 경로 (60분)
- SNS 토픽 + SQS 3개 + DLQ 3개 생성
- 재고 임계치 이하 차감 → SQS에 메시지 도착 확인
- **핵심 체험**: Lambda 없이 메시지가 큐에 쌓이지만 메인 앱은 정상

### Lab 05: Lambda 커넥터 (60분)
- 발주 Lambda 3개 작성 + SQS 이벤트 소스 매핑
- 쌓인 메시지 소비 확인 → CloudWatch 로그
- **핵심 체험**: Lambda가 공장별 다른 API를 어댑터 패턴으로 처리

### Lab 06: 입고 경로 (45분)
- SNS 입고 토픽 + SQS 2개 + 이메일 구독
- 생산 완료 → 재고 충전 + 이메일 알림 수신

### Lab 07: 장애와 복구 — 핵심 실습 (45분)
- 강사가 장애 주입 API(`/admin/chaos`)로 실시간 장애 발생
- **실험 1**: 엔진 공장 shutdown → sedan 주문의 SQS 적체 → 메인 앱은 정상 → ev 주문은 영향 없음
- **실험 2**: 공장 복구(`DELETE /admin/chaos`) → DLQ Redrive → 밀린 발주 순차 처리
- **실험 3**: 타이어 공장 delay(30초) → Lambda 타임아웃 → 모든 차량 타입 영향
- **실험 4**: 배터리 공장 error-rate(50%) → 부분 실패 → DLQ 확인 → ev/suv만 영향

### Lab 08: 전체 통합 (30분)
- End-to-End 시연
- 토론: 프로덕션 전환 시 추가 필요 사항
- CloudFormation 스택 삭제 (비용 방지)

---

## 학생 환경변수

```bash
# .env (학생 메인 앱서버)
ENGINE_FACTORY_URL=http://<강사IP>:3001
TIRE_FACTORY_URL=http://<강사IP>:3002
BATTERY_FACTORY_URL=http://<강사IP>:3003
AWS_REGION=ap-northeast-2
```

---

## 구현 페이즈

### Phase 1: 메인 앱서버 코드
- 주문 생성 API (sedan/ev/suv → 차량 타입별 부품 계산)
- 재고 조회/차감 API
- 재고 임계치 감지 → SNS 발행
- DynamoDB 연동 (Parts, Orders, PurchaseOrders)

### Phase 2: 공장 서버 코드 (강사용)
- 엔진 공장 (:3001) — POST /api/produce
- 타이어 공장 (:3002) — POST /api/manufacture
- 배터리 공장 (:3003) — POST /api/orders
- 장애 주입 API (/admin/chaos) — 3개 공장 공통
- 생산 완료 → SNS 입고 토픽 발행

### Phase 3: Lambda 커넥터 코드
- 발주 Lambda 3개 (SQS → 공장 API, 어댑터 패턴)
- 입고 Lambda 2개 (재고 충전 + 주문 상태 업데이트)

### Phase 4: 프론트엔드
- 대시보드 UI (재고 현황, 주문 목록, 발주 상태)
- 주문 생성 폼 (sedan/ev/suv 선택)

### Phase 5: Terraform
- instructor/ — 공장 EC2 + SG
- student/ — 전체 인프라 모듈화 (networking, dynamodb, ec2, messaging, lambda, s3)

### Phase 6: Lab 문서 + README
- Lab 00~08 (콘솔 기반 가이드)
- README.md

구현 순서: **Phase 1 → 2 → 3 → 4 → 5 → 6**

---

## 확정 사항

- [x] 공장 서버: 강사 EC2 1대에 포트 3개 (3001/3002/3003)
- [x] 학생은 메인 앱 EC2 1대만 생성
- [x] 차량 타입별 부품 차이: sedan(내연기관) / ev(전기차) / suv(하이브리드)
- [x] 장애 주입 API: /admin/chaos (강사 전용)
- [x] SNS 필터링 포함

## 미확인 사항

- [ ] 실습 분량: 8단계가 하루 워크숍 vs 며칠 과정
- [ ] Lambda 패키징: ZIP vs Layer
- [ ] DynamoDB 시드 데이터: CloudFormation CustomResource vs 앱 초기화
