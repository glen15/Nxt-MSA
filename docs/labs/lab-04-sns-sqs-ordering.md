# Lab 04: SNS + SQS 발주 경로 (60분)

## 목표
SNS 토픽과 SQS 큐를 생성하고, 재고 임계치 이하 차감 시 SQS에 메시지가 쌓이는 것을 확인한다.

## Step 1: SNS 토픽 생성 (콘솔)

1. AWS 콘솔 → SNS → 주제 → 주제 생성
2. 유형: **표준**
3. 이름: `parts-ordering`
4. 생성
5. **ARN을 메모**해 둔다

## Step 2: SQS 큐 생성 — 발주 큐 3개 + DLQ 3개

### DLQ 먼저 생성 (3개)
SQS → 대기열 생성:
- `engine-order-dlq` (표준)
- `tire-order-dlq` (표준)
- `battery-order-dlq` (표준)

### 발주 큐 생성 (3개)
- `engine-order` → 배달 못한 메시지 대기열: `engine-order-dlq` (최대 수신 3회)
- `tire-order` → 배달 못한 메시지 대기열: `tire-order-dlq`
- `battery-order` → 배달 못한 메시지 대기열: `battery-order-dlq`

## Step 3: SNS 구독 + 필터 정책

SNS → `parts-ordering` 토픽 → 구독 생성:

### 엔진 큐 구독
- 프로토콜: Amazon SQS
- 엔드포인트: `engine-order` 큐 ARN
- 구독 필터 정책:
```json
{
  "category": ["engine"]
}
```

### 타이어 큐 구독
- 엔드포인트: `tire-order` 큐 ARN
- 필터: `{"category": ["tire"]}`

### 배터리 큐 구독
- 엔드포인트: `battery-order` 큐 ARN
- 필터: `{"category": ["battery"]}`

## Step 4: 메인 앱에 SNS ARN 설정

```bash
export ORDERING_TOPIC_ARN=arn:aws:sns:ap-northeast-2:<계정ID>:parts-ordering
npm start
```

## Step 5: 재고 임계치 실험

### sedan 주문을 반복 → 엔진 재고 소진
```bash
# 여러 번 실행 (엔진 재고 50, 1회 주문당 1개 소모)
for i in $(seq 1 35); do
  curl -s -X POST http://localhost:3000/api/orders \
    -H "Content-Type: application/json" \
    -d '{"vehicleModel": "sedan"}'
  echo ""
done
```

### SQS 콘솔에서 메시지 확인
1. SQS → `engine-order` 큐 → 메시지 전송 및 수신
2. **메시지 폴링** 클릭
3. 발주 메시지가 도착해 있는지 확인

### ev 주문 → 배터리 큐에만 메시지 도착
```bash
for i in $(seq 1 20); do
  curl -s -X POST http://localhost:3000/api/orders \
    -H "Content-Type: application/json" \
    -d '{"vehicleModel": "ev"}'
  echo ""
done
```

## 핵심 확인 포인트
- [ ] sedan 주문 → `engine-order` + `tire-order` 큐에 메시지 (battery는 없음)
- [ ] ev 주문 → `battery-order` + `tire-order` 큐에 메시지 (engine은 없음)
- [ ] suv 주문 → 3개 큐 전부에 메시지
- [ ] Lambda가 없어도 메인 앱은 정상 동작

> 💡 **핵심 체험**: 메시지가 큐에 쌓이지만 **메인 앱은 정상**이다! 이것이 **Loose Coupling**.

## 다음
→ [Lab 05: Lambda 커넥터](lab-05-lambda-connectors.md)
