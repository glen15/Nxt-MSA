# Lab 05: 입고 경로 — 생산 완료에서 재고 충전까지 (90분)

## 목표
공장에서 생산이 완료되면 **자동으로 재고가 충전**되고,
발주 상태가 **RECEIVED**로 업데이트되는 입고 경로를 완성한다.

## 사전 준비
- Lab 04 완료 (발주 경로 동작 확인)
- NxtCar 서버 실행 중

## 전체 흐름

```
Step 1  SNS receiving 토픽 생성       → 공장이 콜백할 목적지
Step 2  SQS 큐 생성                  → 입고 메시지 대기열
Step 3  SNS → SQS 구독              → 토픽과 큐 연결
Step 4  Lambda 생성 (receive-all)     → 재고 충전 + 발주 상태 업데이트
Step 5  order-all Lambda 코드 업데이트 → callbackTopicArn 전달
Step 6  .env에 RECEIVING_TOPIC_ARN 추가 → 콜백 주소 활성화
Step 7  전체 E2E 테스트               → 주문 → 발주 → 생산 → 입고 → 재고 충전
```

---

## 아키텍처: 콜백 패턴

Lab 04까지 완성한 **발주 경로**:
```
NxtCar → SNS(ordering) → SQS → Lambda(order-all) → 공장 API
```

이번 Lab에서 만드는 **입고 경로**:
```
공장 생산 완료 → SNS(receiving) → SQS → Lambda(receive-all) → DynamoDB 업데이트
```

공장은 어떻게 콜백 주소를 알까요?

```
① NxtCar가 발주 메시지에 callbackTopicArn을 포함
② Lambda(order-all)가 공장 API 호출 시 callbackTopicArn을 전달
③ 공장이 생산 완료 후 callbackTopicArn으로 SNS 발행
```

> 💡 **콜백 패턴**: "내가 요청을 보낼 테니, 끝나면 이 주소로 알려줘."
> 결제 API의 웹훅, 배송 추적의 콜백 URL과 같은 패턴입니다.
> 각 학생이 자기만의 receiving 토픽을 만들어서 callbackTopicArn으로 전달하므로,
> 공장은 학생별로 다른 토픽에 완료 메시지를 보냅니다.

---

## Step 1: SNS receiving 토픽 생성 (5분)

1. AWS 콘솔 → **SNS** → **주제 생성**
2. 유형: **표준**
3. 이름: `<USER_PREFIX>-receiving` (예: `kmucd1-00-receiving`)
4. **주제 생성**
5. **ARN 복사** — 나중에 `.env`에 사용

---

## Step 2: SQS 큐 생성 (5분)

1. AWS 콘솔 → **SQS** → **대기열 생성**
2. 유형: **표준**
3. 이름: `<USER_PREFIX>-receiving-queue` (예: `kmucd1-00-receiving-queue`)
4. 기본값 → **대기열 생성**

> Lab 03에서는 SQS 3개 + 필터 정책을 사용했지만,
> 입고 경로는 **1개 큐로 충분**합니다. 모든 공장의 완료 메시지를 같은 Lambda가 처리합니다.

---

## Step 3: SNS → SQS 구독 (5분)

1. **SNS** 콘솔 → `<USER_PREFIX>-receiving` 토픽 → **구독 생성**
2. 프로토콜: **Amazon SQS**
3. 엔드포인트: `<USER_PREFIX>-receiving-queue`의 ARN
4. 필터 정책: **설정 안 함** (모든 메시지 수신)
5. **구독 생성**

---

## Step 4: Lambda 생성 — receive-all (20분)

### 4-1. 함수 생성

1. AWS 콘솔 → **Lambda** → **함수 생성**
2. 함수 이름: `<USER_PREFIX>-receive-lambda` (예: `kmucd1-00-receive-lambda`)
3. 런타임: **Node.js 20.x** 이상
4. 역할: **기존 역할 사용** → `Nxt-msa-lambda-role`
5. **함수 생성**

### 4-2. 코드 입력

`index.mjs` 삭제 → `index.js` 생성 → 아래 코드 붙여넣기 → **Deploy**:

```javascript
// Lab용 통합 입고 Lambda — 재고 충전 + 발주 상태 업데이트를 한 함수에서 처리
// 미션: 이 Lambda를 receive-stock, update-order-status 두 개로 분리하세요
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const PARTS_TABLE = process.env.PARTS_TABLE || 'Parts';
const PURCHASE_ORDERS_TABLE = process.env.PURCHASE_ORDERS_TABLE || 'PurchaseOrders';

exports.handler = async (event) => {
  const results = [];

  for (const record of event.Records) {
    // SQS → SNS wrapping 해제
    const snsEnvelope = JSON.parse(record.body);
    const message = JSON.parse(snsEnvelope.Message);

    const { purchaseOrderId, partId, quantity, factoryId, producedAt } = message;
    console.log(`[입고] 메시지 수신: ${partId} × ${quantity} from ${factoryId}`, JSON.stringify(message));

    // 1. 재고 충전 + orderPending 해제
    try {
      const stockResult = await docClient.send(
        new UpdateCommand({
          TableName: PARTS_TABLE,
          Key: { partId },
          UpdateExpression: 'SET currentStock = currentStock + :qty, orderPending = :false, updatedAt = :now',
          ExpressionAttributeValues: {
            ':qty': quantity,
            ':false': false,
            ':now': new Date().toISOString(),
          },
          ReturnValues: 'ALL_NEW',
        })
      );
      console.log(`[입고→재고] ${partId} +${quantity} → 현재: ${stockResult.Attributes.currentStock} (발주대기 해제)`);
    } catch (err) {
      console.error(`[입고→재고] 실패: ${partId}`, err.message);
      throw err;
    }

    // 2. 발주 상태 RECEIVED로 업데이트
    try {
      await docClient.send(
        new UpdateCommand({
          TableName: PURCHASE_ORDERS_TABLE,
          Key: { purchaseOrderId },
          UpdateExpression: 'SET #s = :status, receivedAt = :now, producedAt = :produced, factoryId = :fid, receivedQuantity = :qty',
          ExpressionAttributeNames: { '#s': 'status' },
          ExpressionAttributeValues: {
            ':status': 'RECEIVED',
            ':now': new Date().toISOString(),
            ':produced': producedAt || new Date().toISOString(),
            ':fid': factoryId,
            ':qty': quantity,
          },
        })
      );
      console.log(`[입고→상태] ${purchaseOrderId} → RECEIVED (${factoryId})`);
    } catch (err) {
      console.error(`[입고→상태] 실패: ${purchaseOrderId}`, err.message);
      throw err;
    }

    results.push({ partId, quantity, purchaseOrderId, factoryId });
  }

  return { processed: results.length, results };
};
```

### 4-3. 환경변수 설정

**구성** 탭 → **환경 변수** → **편집**:

| 키 | 값 |
|---|---|
| `PARTS_TABLE` | `<USER_PREFIX>-Parts` (예: `kmucd1-00-Parts`) |
| `PURCHASE_ORDERS_TABLE` | `<USER_PREFIX>-PurchaseOrders` (예: `kmucd1-00-PurchaseOrders`) |

> ⚠️ 값 끝에 **공백이 들어가지 않도록** 주의하세요. 공백이 포함되면 DynamoDB 테이블을 찾지 못합니다.

### 4-4. 타임아웃 설정

**구성** → **일반 구성** → **편집** → 타임아웃: **30초** → **저장**

### 4-5. SQS 트리거 연결

1. **트리거 추가**
2. 소스: **SQS**
3. 대기열: `<USER_PREFIX>-receiving-queue`
4. 배치 크기: **1** (기본값 10 → **반드시 1로 변경**)
5. **추가**

> ⚠️ 배치 크기가 10이면 메시지 10개가 한꺼번에 Lambda에 전달됩니다.
> 이 중 하나라도 실패하면 **10개 전부 재시도**됩니다. 1로 설정하세요.

---

## Step 5: order-all Lambda 코드 업데이트 (5분)

현재 order-all Lambda는 공장에 `callbackTopicArn`을 전달하지 않고 있습니다.
공장이 생산 완료 후 콜백할 수 있도록 코드를 업데이트합니다.

Lambda 콘솔 → `<USER_PREFIX>-order-lambda` → 코드에서 **두 군데** 수정:

**1. 메시지에서 callbackTopicArn 추출 (31번째 줄 부근):**
```javascript
const { category, purchaseOrderId, partId, quantity, requester, callbackTopicArn } = message;
```

**2. 공장 API 호출 시 callbackTopicArn 전달:**
```javascript
const response = await callFactory(`${factory.url}${factory.path}`, {
    purchaseOrderId,
    partId,
    quantity,
    requester,
    callbackTopicArn,  // ← 이 줄 추가
});
```

수정 후 **Deploy** 클릭.

> 💡 이 한 줄이 추가됨으로써 공장은 생산 완료 후 어디로 알려야 하는지 알게 됩니다.
> NxtCar → SNS 메시지에 `callbackTopicArn` 포함 → Lambda가 공장에 전달 → 공장이 콜백.

---

## Step 6: .env에 RECEIVING_TOPIC_ARN 추가 (5분)

Cloud9에서 main-app의 `.env` 파일에 추가합니다:

```
RECEIVING_TOPIC_ARN=arn:aws:sns:us-east-1:123456789012:kmucd1-00-receiving
```

> Step 1에서 복사해 둔 receiving 토픽 ARN을 붙여넣으세요.

서버를 재시작합니다:

```bash
# Ctrl+C로 기존 서버 중지 후
npm start
```

**예상 출력:**
```
   [SNS]
   ✅ 발주토픽: arn:aws:sns:...:kmucd1-00-sns
   ✅ 입고토픽: arn:aws:sns:...:kmucd1-00-receiving
```

`입고토픽`이 ✅로 표시되면 준비 완료입니다.

---

## Step 7: 전체 E2E 테스트 (40분)

### 7-1. 재고 초기화

프론트엔드에서 **🔄 재고 초기화** 클릭.

| 부품 | 초기 재고 | 임계치 | 발주 수량 |
|------|:---------:|:------:|:--------:|
| ENGINE-V6 | 10 | 5 | 5 |
| TIRE-R18 | 40 | 20 | 20 |
| BATTERY-72KWH | 8 | 3 | 5 |

### 7-2. 주문으로 재고 부족 유발

**세단**을 6번 주문하여 엔진과 타이어를 임계치 이하로 떨어뜨립니다:

| 주문 | 엔진 | 타이어 | 이벤트 |
|------|:----:|:-----:|--------|
| 1회 | 9 | 36 | |
| 2회 | 8 | 32 | |
| 3회 | 7 | 28 | |
| 4회 | 6 | 24 | |
| 5회 | 5 | 20 | **임계치 도달! 엔진+타이어 발주** |
| 6회 | ⚠️ | ⚠️ | 재고 부족 — 부품 입고 대기 |

### 7-3. 전체 흐름 관찰

5회째 주문 후, 다음 순서대로 자동 진행됩니다:

```
① NxtCar: 재고 차감 → 임계치 이하 → 발주 생성 (ORDERED)
     ↓ SNS(ordering) 발행 — callbackTopicArn 포함
② SQS(engine-order, tire-order): 메시지 도착
     ↓ Lambda(order-all) 자동 실행
③ 공장 API 호출 — callbackTopicArn 전달
     ↓ 공장 생산 시작 (6~24초 소요)
④ 공장 생산 완료 → callbackTopicArn으로 SNS(receiving) 발행
     ↓ SQS(receiving-queue): 메시지 도착
⑤ Lambda(receive-all) 자동 실행
     ↓ DynamoDB 업데이트
⑥ Parts 테이블: currentStock 증가 + orderPending 해제
   PurchaseOrders 테이블: status → RECEIVED
```

### 7-4. 확인 포인트

**공장 허브 대시보드** (`http://<공장IP>:3000`):
- 엔진/타이어 공장에 생산 작업 표시
- 요청자 컬럼에 본인 ID 표시
- 진행률이 올라가다가 완료

**NxtCar 프론트엔드**:
- 📦 부품 재고: 생산 완료 후 재고가 **자동 증가** (엔진 +5, 타이어 +20)
- 🏭 발주 현황: 상태가 `발주됨` → `입고 완료`로 변경
- 📥 최근 입고: 생산 완료 시각 + 입고 처리 시각 표시

**CloudWatch 로그** (`receive-lambda`):
```
[입고] 메시지 수신: ENGINE-V6 × 5 from engine-factory
[입고→재고] ENGINE-V6 +5 → 현재: 10 (발주대기 해제)
[입고→상태] uuid-... → RECEIVED (engine-factory)
```

### 7-5. 6회째 주문 재시도

재고가 충전된 후 **세단**을 다시 주문합니다.

- 이전: `⚠️ 재고 부족 — 부품 입고 대기 중`
- 이번: `주문 완료!` — 재고가 충전되었으므로 정상 차감

> 🤔 **생각해보기**: 전체 과정이 **비동기**로 진행됩니다.
> 주문 → 발주 → 생산 → 입고가 각각 독립적으로 처리되며,
> 각 단계 사이에 SNS/SQS가 메시지를 안전하게 전달합니다.
> 공장이 느려도 NxtCar는 즉시 응답하고, 공장이 다운되어도 메시지는 큐에서 대기합니다.
> 이것이 **최종 일관성(Eventual Consistency)**입니다.

---

## 핵심 확인 포인트

| # | 확인 항목 | 상태 |
|---|----------|------|
| 1 | SNS receiving 토픽 생성 | ☐ |
| 2 | SQS receiving-queue 생성 | ☐ |
| 3 | SNS → SQS 구독 연결 | ☐ |
| 4 | receive-all Lambda 생성 + 환경변수 + 트리거 | ☐ |
| 5 | order-all Lambda에 callbackTopicArn 전달 코드 추가 | ☐ |
| 6 | .env에 RECEIVING_TOPIC_ARN 추가 → 서버 재시작 → ✅ 입고토픽 | ☐ |
| 7 | 주문 → 재고 부족 → 공장 생산 → 재고 자동 충전 확인 | ☐ |
| 8 | 발주 상태 ORDERED → RECEIVED 변경 확인 | ☐ |
| 9 | 최근 입고 섹션에 생산 완료/입고 처리 시각 표시 | ☐ |

---

## 교육 포인트 정리

### 이 Lab에서 배운 것
1. **콜백 패턴**: 요청 시 콜백 주소를 함께 보내고, 처리 완료 시 콜백으로 알림
2. **최종 일관성**: 주문 → 재고 충전이 즉시가 아닌 비동기로 진행되지만 결국 일관된 상태 도달
3. **orderPending 플래그**: 중복 발주 방지를 위한 상태 관리
4. **전체 E2E 흐름**: NxtCar → SNS → SQS → Lambda → 공장 → SNS → SQS → Lambda → DynamoDB

### 전체 아키텍처 완성

```
┌──────────┐     ┌──────────┐     ┌──────────────┐
│  S3      │     │  EC2     │     │  DynamoDB    │
│ 프론트엔드│────→│ API 서버  │←──→│ Parts       │
│          │     │          │     │ Orders      │
└──────────┘     └────┬─────┘     │ PurchaseOrders│
                      │           └──────┬───────┘
                 재고 부족 시              │ ⑥ 재고 충전
                      ▼                  │ + 상태 업데이트
                ┌───────────┐            │
                │ SNS 발주   │   ┌────────┴────────┐
                │ (ordering) │   │ Lambda           │
                └─────┬─────┘   │ (receive-all)    │
          ┌───────────┼────┐    └────────┬────────┘
          ▼           ▼    ▼             ▲
     ┌─────────┐ ┌──────┐ ┌──────┐      │ ⑤
     │ SQS     │ │ SQS  │ │ SQS  │  ┌───┴───────┐
     │ engine  │ │ tire │ │battery│  │ SQS       │
     └────┬────┘ └──┬───┘ └──┬───┘  │ receiving │
          └─────────┼────────┘      └───┬───────┘
                    ▼                    │
          ┌──────────────────┐           │ ④ 콜백
          │ Lambda (order-all)│           │
          └────────┬─────────┘    ┌──────┴──────┐
                   │              │ SNS 입고     │
          ┌────────┼────────┐     │ (receiving)  │
          ▼        ▼        ▼     └──────┬──────┘
     ┌────────┐┌────────┐┌────────┐      │
     │엔진공장 ││타이어   ││배터리   │──────┘ ③ 생산 완료
     │ :3001  ││ :3002  ││ :3003  │
     └────────┘└────────┘└────────┘
```

### 미션 예고

**미션 A: 발주 Lambda 분리**
`order-all` 1개를 `order-engine`, `order-tire`, `order-battery` 3개로 분리.
코드는 `lambdas/` 디렉토리에 준비되어 있음.

**미션 B: 입고 Lambda 분리**
`receive-all` 1개를 `receive-stock`, `update-order-status` 2개로 분리.
이 경우 SQS 큐도 2개로 나누고 SNS fan-out 적용.

---

## 트러블슈팅

### Lambda 로그에 `SyntaxError: Unexpected token`
→ SQS 큐에 테스트 메시지가 남아있을 수 있습니다.
→ 관리자에게 SQS 큐 purge를 요청하거나, 트리거를 비활성화 후 재활성화하세요.

### `Invalid parameter: TopicArn`
→ 공장 서버의 `AWS_REGION`이 `us-east-1`인지 확인하세요.
→ 강사에게 공장 서버 설정을 문의하세요.

### 재고가 충전되지 않음
→ CloudWatch에서 `receive-lambda` 로그 확인.
→ 환경변수 `PARTS_TABLE` 값 끝에 공백이 없는지 확인.
→ `RECEIVING_TOPIC_ARN`이 `.env`에 설정되었는지 확인.
→ `order-all` Lambda에 `callbackTopicArn` 전달 코드가 추가되었는지 확인.

### 발주 상태가 ORDERED에서 안 바뀜
→ `receive-lambda`의 `PURCHASE_ORDERS_TABLE` 환경변수가 정확한지 확인.

---

## 다음
→ Lab 06: 장애와 복구 — Chaos API로 공장 장애 주입 + DLQ Redrive
