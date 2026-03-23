# Lab 03: 공장 API 탐험 (30분)

## 목표
강사가 미리 띄워둔 공장 서버 3개의 API를 직접 호출하며, API가 전부 다르다는 것을 체험한다.

## 강사 공장 서버 정보
```
엔진 공장:  http://<강사IP>:3001
타이어 공장: http://<강사IP>:3002
배터리 공장: http://<강사IP>:3003
```

## Step 1: 헬스 체크 — 벌써 다르다!

```bash
# 엔진 공장
curl http://<강사IP>:3001/api/health | jq

# 타이어 공장
curl http://<강사IP>:3002/api/health | jq

# 배터리 공장 — /health가 아닌 /ping!
curl http://<강사IP>:3003/api/ping
```

> ❓ 왜 배터리 공장만 `/ping`일까? 실무에서도 팀마다 API 규칙이 다르다.

## Step 2: 생산 요청 — 엔드포인트도 전부 다름

### 엔진 공장 — POST /api/produce
```bash
curl -X POST http://<강사IP>:3001/api/produce \
  -H "Content-Type: application/json" \
  -d '{
    "purchaseOrderId": "test-001",
    "partId": "ENGINE-V6",
    "quantity": 10
  }' | jq
```
→ 응답: `202 Accepted`, `jobId` 반환

### 타이어 공장 — POST /api/manufacture
```bash
curl -X POST http://<강사IP>:3002/api/manufacture \
  -H "Content-Type: application/json" \
  -d '{
    "purchaseOrderId": "test-002",
    "partId": "TIRE-R18",
    "quantity": 40
  }' | jq
```
→ 응답: `202 Accepted`, `manufacturingId` 반환, `trackUrl` 제공

### 배터리 공장 — POST /api/orders
```bash
curl -X POST http://<강사IP>:3003/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "purchaseOrderId": "test-003",
    "partId": "BATTERY-72KWH",
    "quantity": 5
  }' | jq
```
→ 응답: `200 OK` (202가 아님!), `orderNumber` 반환

## Step 3: 상태 조회 — 방법도 다르다

```bash
# 엔진: GET /api/status/:jobId
curl http://<강사IP>:3001/api/status/<jobId> | jq

# 타이어: GET /api/jobs/:manufacturingId
curl http://<강사IP>:3002/api/jobs/<manufacturingId> | jq

# 배터리: POST /api/orders/status (GET이 아닌 POST!)
curl -X POST http://<강사IP>:3003/api/orders/status \
  -H "Content-Type: application/json" \
  -d '{"orderNumber": "<orderNumber>"}' | jq
```

## 비교표

| | 엔진 공장 | 타이어 공장 | 배터리 공장 |
|---|---|---|---|
| 포트 | 3001 | 3002 | 3003 |
| 생산 요청 | `POST /api/produce` | `POST /api/manufacture` | `POST /api/orders` |
| 상태 조회 | `GET /api/status/:id` | `GET /api/jobs/:id` | `POST /api/orders/status` |
| 헬스 체크 | `GET /api/health` | `GET /api/health` | `GET /api/ping` |
| 응답 코드 | 202 | 202 | 200 |
| ID 필드 | `jobId` | `manufacturingId` | `orderNumber` |

> 💡 **교육 포인트**: 실무에서 외부 API는 항상 이렇다. Lambda가 이 차이를 흡수하는 **어댑터 패턴**을 다음 Lab에서 구현한다.

## 다음
→ [Lab 04: SNS + SQS 발주 경로](lab-04-sns-sqs-ordering.md)
