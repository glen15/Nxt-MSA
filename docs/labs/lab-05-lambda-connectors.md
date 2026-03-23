# Lab 05: Lambda 커넥터 (60분)

## 목표
발주 Lambda 3개를 작성하여 SQS 메시지를 소비하고, 각 공장 API를 호출한다.

## Step 1: Lambda 코드 패키징

```bash
# 각 Lambda를 ZIP으로 패키징
cd lambdas/order-engine && zip -r ../../order-engine.zip index.js
cd ../order-tire && zip -r ../../order-tire.zip index.js
cd ../order-battery && zip -r ../../order-battery.zip index.js
```

## Step 2: IAM 역할 생성 (콘솔)

1. IAM → 역할 → 역할 만들기
2. 신뢰 정책: Lambda
3. 정책 연결:
   - `AWSLambdaBasicExecutionRole` (CloudWatch 로그)
   - `AWSLambdaSQSQueueExecutionRole` (SQS 읽기)
4. 역할 이름: `nxt-msa-lambda-role`

## Step 3: Lambda 함수 생성 (콘솔)

### order-engine Lambda
1. Lambda → 함수 생성
2. 이름: `order-engine`
3. 런타임: Node.js 20.x
4. 역할: `nxt-msa-lambda-role`
5. 코드: `order-engine.zip` 업로드
6. 환경 변수:
   - `ENGINE_FACTORY_URL` = `http://<강사IP>:3001`
7. 제한 시간: 30초
8. **트리거 추가** → SQS → `engine-order` 큐, 배치 크기 1

### order-tire Lambda
- 이름: `order-tire`
- 환경 변수: `TIRE_FACTORY_URL` = `http://<강사IP>:3002`
- 트리거: `tire-order` 큐

### order-battery Lambda
- 이름: `order-battery`
- 환경 변수: `BATTERY_FACTORY_URL` = `http://<강사IP>:3003`
- 트리거: `battery-order` 큐

## Step 4: 쌓인 메시지 소비 확인

Lab 04에서 쌓아둔 메시지가 있다면:
1. Lambda가 자동으로 SQS 메시지를 가져감
2. CloudWatch → 로그 그룹 → `/aws/lambda/order-engine`
3. 공장 API 호출 로그 확인

없다면 다시 주문:
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"vehicleModel": "suv"}'
```

## Step 5: 코드 분석 — 어댑터 패턴

3개 Lambda의 코드를 비교해보자:

| | order-engine | order-tire | order-battery |
|---|---|---|---|
| 호출 URL | `/api/produce` | `/api/manufacture` | `/api/orders` |
| 동일한 입력 | SQS 메시지 | SQS 메시지 | SQS 메시지 |
| 다른 출력 | `jobId` | `manufacturingId` | `orderNumber` |

> 💡 **교육 포인트**: Lambda가 **어댑터(Adapter)** 역할. 동일한 SQS 메시지를 받아 공장별 다른 API 형식으로 변환한다.

## 핵심 확인 포인트
- [ ] CloudWatch 로그에 공장 호출 성공 메시지
- [ ] SQS 큐의 메시지가 소비되어 비었는가
- [ ] DLQ에 메시지가 없는가 (정상이면 없어야 함)

## 다음
→ [Lab 06: 입고 경로](lab-06-receiving-path.md)
