# Lab 06: 입고 경로 (45분)

## 목표
입고 SNS 토픽 + SQS 큐를 생성하고, 공장 생산 완료 시 재고가 자동으로 충전되는 것을 확인한다.

## Step 1: 입고 SNS 토픽 생성

1. SNS → `parts-receiving` 토픽 생성 (표준)
2. **ARN 메모**

## Step 2: 입고 SQS 큐 생성

### DLQ
- `stock-dlq`
- `order-status-dlq`

### 큐
- `stock` → DLQ: `stock-dlq`
- `order-status` → DLQ: `order-status-dlq`

## Step 3: SNS 구독 설정

`parts-receiving` 토픽에 구독 추가:
- `stock` 큐 (SQS)
- `order-status` 큐 (SQS)
- 이메일 주소 (선택) — 본인 이메일로 알림 수신

## Step 4: 입고 Lambda 생성

### receive-stock Lambda
```bash
cd lambdas/receive-stock && zip -r ../../receive-stock.zip index.js
```
- 환경 변수: `PARTS_TABLE` = `Parts`
- 트리거: `stock` 큐

### update-order-status Lambda
```bash
cd lambdas/update-order-status && zip -r ../../update-order-status.zip index.js
```
- 환경 변수: `PURCHASE_ORDERS_TABLE` = `PurchaseOrders`
- 트리거: `order-status` 큐

## Step 5: 강사 공장에 입고 토픽 ARN 전달

강사에게 `parts-receiving` 토픽 ARN을 전달하면,
공장 서버가 생산 완료 시 이 토픽으로 메시지를 발행한다.

## Step 6: End-to-End 테스트

1. 재고를 임계치 이하로 떨어뜨림 (주문 반복)
2. SNS 발주 → SQS → Lambda → 공장 API 호출
3. 공장 생산 완료 (수 초 후)
4. 공장 → SNS 입고 → SQS → Lambda → DynamoDB 재고 충전
5. 재고 확인:
```bash
curl http://localhost:3000/api/parts | jq
```

## 핵심 확인 포인트
- [ ] 공장 생산 완료 후 재고가 자동으로 충전되는가
- [ ] PurchaseOrders 상태가 RECEIVED로 변경되는가
- [ ] 이메일 알림을 수신했는가 (구독한 경우)

> 💡 **교육 포인트**: **Eventually Consistent** — 주문 시점에는 재고가 부족하지만, 시간이 지나면 자동으로 충전된다.

## 다음
→ [Lab 07: 장애와 복구](lab-07-chaos-and-recovery.md)
