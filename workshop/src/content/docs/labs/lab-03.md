---
title: "Lab 03: SNS + SQS 발주"
---


## 목표
SNS 토픽과 SQS 큐를 생성하여 **발주 메시지 경로**를 구성한다.
NxtCar에서 주문하면 재고 부족 시 SNS에 메시지가 발행되고,
SQS 큐에 메시지가 도착하는 것까지 확인한다.

## 사전 준비
- Lab 01, 02 완료
- NxtCar 서버 실행 중
- `.env`에 `USER_PREFIX` 설정 완료

## 전체 흐름

```
Step 1  SNS 토픽 생성              → 메시지를 보낼 곳 만들기
Step 2  SQS 큐 3개 생성            → 메시지를 받을 곳 만들기
Step 3  SNS → SQS 구독 + 필터     → 토픽과 큐를 연결하기
Step 4  .env에 토픽 ARN 연결       → NxtCar가 SNS에 발행할 수 있게
Step 5  주문 테스트                 → 재고 부족 → SQS에 메시지 도착 확인
```

---

## Step 1: SNS 토픽 생성 (10분)

### SNS란?

**Simple Notification Service** — 메시지를 발행(Publish)하면 구독자(Subscriber)에게 전달하는 서비스입니다.

```
발행자 (NxtCar) ──→ SNS 토픽 ──→ 구독자 (SQS, Lambda, Email 등)
```

NxtCar는 "엔진 20개 필요"를 **토픽에 던질 뿐**입니다.
누가 구독하고 있는지, 몇 명이 받는지 모르고, 알 필요도 없습니다.

### 1-1. 토픽 생성

1. AWS 콘솔 → **SNS** → 왼쪽 메뉴 **주제(Topics)** → **주제 생성**
2. 유형: **표준(Standard)**
3. 이름: `<USER_PREFIX>-parts-ordering` (예: `kmucd1-03-parts-ordering`)
4. 나머지 기본값 → **주제 생성**

### 1-2. 토픽 ARN 복사

생성된 토픽 상세 페이지에서 **ARN**을 복사해 둡니다.

```
arn:aws:sns:us-east-1:123456789012:kmucd1-03-parts-ordering
```

> 💡 **ARN(Amazon Resource Name)**은 AWS 리소스의 고유 주소입니다.
> 서비스:리전:계정:리소스 형태로 모든 AWS 리소스를 식별합니다.

---

## Step 2: SQS 큐 3개 생성 (20분)

### SQS란?

**Simple Queue Service** — 메시지를 저장하고, 소비자가 가져갈 때까지 보관하는 큐입니다.

SNS와의 차이:

| | SNS | SQS |
|---|---|---|
| 역할 | 발행 + 분배 (우체국) | 저장 + 대기 (우편함) |
| 소비자 없으면? | 메시지 사라짐 | **큐에 보관** |
| 패턴 | 1:N (Fan-out) | 1:1 (하나씩 소비) |

SNS 혼자서는 메시지를 보관할 수 없습니다.
SQS가 있어야 소비자(Lambda)가 준비될 때까지 메시지가 안전하게 대기합니다.

### 2-1. 엔진 발주 큐

1. AWS 콘솔 → **SQS** → **대기열 생성**
2. 유형: **표준**
3. 이름: `<USER_PREFIX>-engine-order` (예: `kmucd1-03-engine-order`)
4. 나머지 기본값 → **대기열 생성**

### 2-2. 타이어 발주 큐

같은 방법으로:
- 이름: `<USER_PREFIX>-tire-order` (예: `kmucd1-03-tire-order`)

### 2-3. 배터리 발주 큐

같은 방법으로:
- 이름: `<USER_PREFIX>-battery-order` (예: `kmucd1-03-battery-order`)

### 2-4. 확인

SQS 콘솔에서 본인 접두사로 시작하는 큐 3개가 보이면 성공입니다:

| 큐 이름 | 용도 |
|---------|------|
| `<USER_PREFIX>-engine-order` | 엔진 발주 메시지 |
| `<USER_PREFIX>-tire-order` | 타이어 발주 메시지 |
| `<USER_PREFIX>-battery-order` | 배터리 발주 메시지 |

---

## Step 3: SNS → SQS 구독 + 필터 정책 (20분)

토픽과 큐를 **구독(Subscription)**으로 연결합니다.
핵심은 **필터 정책**입니다 — 모든 메시지가 모든 큐에 가는 것이 아니라,
`category`에 따라 해당 큐에만 전달됩니다.

```
SNS ordering 토픽
  ├─ category = "engine"  → engine-order 큐만
  ├─ category = "tire"    → tire-order 큐만
  └─ category = "battery" → battery-order 큐만
```

### 3-1. 엔진 큐 구독

1. **SNS** 콘솔 → 아까 만든 `<USER_PREFIX>-parts-ordering` 토픽 클릭
2. **구독 생성** 클릭
3. 프로토콜: **Amazon SQS**
4. 엔드포인트: `<USER_PREFIX>-engine-order` 큐의 **ARN** 선택
   - SQS 콘솔에서 해당 큐 클릭 → 상세에서 ARN 복사
5. **구독 필터 정책 활성화** → **JSON 편집기**에 입력:

```json
{
  "category": ["engine"]
}
```

6. **구독 생성**

> 💡 **필터 정책**은 SNS가 메시지의 `MessageAttributes`를 보고
> 조건에 맞는 구독자에게만 전달하는 기능입니다.
> NxtCar가 `category: "engine"`으로 메시지를 보내면
> 이 필터가 걸린 engine-order 큐에만 도착합니다.

### 3-2. 타이어 큐 구독

같은 토픽에서 **구독 생성**:
- 프로토콜: Amazon SQS
- 엔드포인트: `<USER_PREFIX>-tire-order` 큐의 ARN
- 필터 정책:

```json
{
  "category": ["tire"]
}
```

### 3-3. 배터리 큐 구독

같은 토픽에서 **구독 생성**:
- 프로토콜: Amazon SQS
- 엔드포인트: `<USER_PREFIX>-battery-order` 큐의 ARN
- 필터 정책:

```json
{
  "category": ["battery"]
}
```

### 3-4. 구독 확인

토픽 상세 → **구독** 탭에서 3개 구독이 모두 **확인됨** 상태인지 확인합니다.

| 엔드포인트 | 필터 정책 | 상태 |
|-----------|----------|------|
| `...-engine-order` | `category: ["engine"]` | 확인됨 |
| `...-tire-order` | `category: ["tire"]` | 확인됨 |
| `...-battery-order` | `category: ["battery"]` | 확인됨 |

### 3-5. SQS 액세스 정책 확인

> ⚠️ **중요**: SNS 콘솔에서 SQS 구독을 생성하면 **SQS 액세스 정책이 자동으로 추가**됩니다.
> 만약 메시지가 도착하지 않는다면, SQS 콘솔 → 큐 선택 → **액세스 정책** 탭에서
> SNS 토픽의 `sqs:SendMessage` 권한이 있는지 확인하세요.

---

## Step 4: NxtCar에 토픽 연결 (10분)

### 4-1. .env 파일 수정

Cloud9 터미널에서 main-app의 `.env` 파일을 수정합니다:

```bash
cd ~/environment/Nxt-MSA/main-app
```

`.env` 파일에 `ORDERING_TOPIC_ARN`을 추가합니다:

```
USER_PREFIX=kmucd1-03
APP_PORT=3000
AWS_REGION=us-east-1
ORDERING_TOPIC_ARN=arn:aws:sns:us-east-1:123456789012:kmucd1-03-parts-ordering
```

> Step 1에서 복사해 둔 ARN을 붙여넣으세요.

### 4-2. 서버 재시작

```bash
# Ctrl+C로 기존 서버 중지 후
npm start
```

**예상 출력:**
```
🚗 NxtCar 메인 앱서버 (포트: 3000)
   유저: kmucd1-03
   리전: us-east-1

   [DynamoDB]
   ✅ kmucd1-03-Parts — 연결됨 (3건)
   ✅ kmucd1-03-Orders — 연결됨
   ✅ kmucd1-03-PurchaseOrders — 연결됨

   [SNS]
   ✅ 발주토픽: arn:aws:sns:us-east-1:...:kmucd1-03-parts-ordering
```

`❌ 발주토픽 — 미설정`이 `✅`로 바뀌었습니다!

---

## Step 5: 발주 테스트 (25분)

### 5-1. 재고 초기화

S3 프론트엔드에서 **🔄 재고 초기화** 버튼을 눌러 재고를 초기값으로 되돌립니다.

| 부품 | 초기 재고 | 임계치 |
|------|:---------:|:------:|
| ENGINE-V6 | 10 | 5 |
| TIRE-R18 | 40 | 20 |
| BATTERY-72KWH | 8 | 3 |

### 5-2. 주문으로 재고 부족 유발

전기차(EV)를 반복 주문하여 배터리 재고를 임계치 이하로 떨어뜨립니다.

전기차 1대 = 배터리 2개 + 타이어 4개

| 주문 | 배터리 재고 | 상태 |
|------|:----------:|------|
| 전기차 1회 | 8 → 6 | 아직 임계치(3) 위 |
| 전기차 2회 | 6 → 4 | 아직 임계치(3) 위 |
| 전기차 3회 | 4 → 2 | **임계치(3) 이하! 발주 발생** |

### 5-3. 서버 로그 확인

3회째 주문 후 Cloud9의 서버 로그를 확인합니다:

**Lab 01에서 본 로그 (SNS 미설정):**
```
[SNS 미설정] 발주 메시지 스킵: { partId: 'BATTERY-72KWH', quantity: 10, category: 'battery' }
```

**이번에 보이는 로그 (SNS 연결됨):**
```
[SNS] 발주 메시지 발행: BATTERY-72KWH × 10 (MessageId: abcd-1234-...)
```

> Lab 01에서는 SNS가 없어서 `PENDING`이었던 발주가,
> 이제 `ORDERED`로 바뀌었습니다.

### 5-4. SQS에서 메시지 확인

이제 SNS가 메시지를 필터링해서 battery-order 큐에 전달했는지 확인합니다.

1. AWS 콘솔 → **SQS** → `<USER_PREFIX>-battery-order` 큐 클릭
2. **메시지 전송 및 수신** 버튼 클릭 (우측 상단)
3. **메시지 폴링** 클릭

메시지가 1개 보이면 성공입니다! 클릭해서 내용을 확인합니다:

```json
{
  "Type": "Notification",
  "MessageId": "...",
  "TopicArn": "arn:aws:sns:...:kmucd1-03-parts-ordering",
  "Message": "{\"purchaseOrderId\":\"uuid-...\",\"partId\":\"BATTERY-72KWH\",\"quantity\":10,\"category\":\"battery\",\"orderedAt\":\"2026-03-26T...\"}"
}
```

> 💡 **SNS 래핑**: SQS에 도착한 메시지 본문은 SNS가 감싸고 있습니다.
> 실제 발주 데이터는 `Message` 필드 안에 JSON 문자열로 들어 있습니다.
> 나중에 Lambda에서 이 래핑을 벗겨내고 실제 데이터를 꺼내야 합니다.

### 5-5. 다른 큐 확인

- `engine-order` 큐 → 메시지 **없음** (배터리 발주이므로 필터에 의해 걸러짐)
- `tire-order` 큐 → 타이어도 임계치 이하가 되었다면 메시지 있음

> 🤔 **생각해보기**: 왜 engine-order 큐에는 메시지가 없을까?
> SNS 필터 정책이 `category: ["engine"]`인 메시지만 통과시키기 때문이다.
> 배터리 발주 메시지의 category는 `"battery"`이므로 engine-order 큐에는 전달되지 않는다.
> **이것이 Fan-out + 필터링입니다.**

### 5-6. 전체 흐름 확인

세단(sedan)도 주문하여 엔진 재고를 임계치 이하로 떨어뜨려 보세요.

```
세단 주문 → 엔진(-1), 타이어(-4)
         → 엔진 재고 ≤ 5 → SNS 발행 (category: "engine")
         → engine-order 큐에 메시지 도착!
```

**3개 큐 상태 확인:**

| 큐 | 메시지 | 설명 |
|---|:------:|------|
| engine-order | 있음 | 엔진 발주 메시지 |
| tire-order | 있음 (타이어도 임계치 이하라면) | 타이어 발주 메시지 |
| battery-order | 있음 | 배터리 발주 메시지 |

---

## 핵심 확인 포인트

| # | 확인 항목 | 상태 |
|---|----------|------|
| 1 | SNS 토픽 `<USER_PREFIX>-parts-ordering` 생성됨 | ☐ |
| 2 | SQS 큐 3개 생성됨 (engine/tire/battery) | ☐ |
| 3 | SNS 구독 3개 + 필터 정책 설정됨 | ☐ |
| 4 | `.env`에 `ORDERING_TOPIC_ARN` 추가 후 서버 재시작 → ✅ 표시 | ☐ |
| 5 | 주문으로 재고 부족 유발 → 서버 로그에 `[SNS] 발주 메시지 발행` 출력 | ☐ |
| 6 | 해당 SQS 큐에서 메시지 폴링 → 메시지 도착 확인 | ☐ |
| 7 | 다른 큐에는 메시지가 없는 것 확인 (필터 동작) | ☐ |

---

## 교육 포인트 정리

### 이 Lab에서 배운 것
1. **SNS 토픽**: 메시지를 발행하는 채널. 구독자에게 Fan-out
2. **SQS 큐**: 메시지를 저장하고 소비자가 가져갈 때까지 보관
3. **필터 정책**: `MessageAttributes`의 값으로 구독자를 선택적으로 매칭
4. **SNS 래핑**: SQS에 도착한 메시지는 SNS 봉투(envelope)에 감싸져 있음

### 현재 상태

```
NxtCar ──→ SNS (ordering) ──→ 3개 SQS 큐 ──→ ??? (소비자 없음)
                                                 ↑
                                            메시지가 쌓여만 있음
```

SNS → SQS까지 메시지가 도착하지만, **아직 SQS에서 메시지를 꺼내서 공장에 전달하는 소비자가 없습니다.**
SQS 큐에 메시지가 계속 쌓이기만 합니다.

### 아직 안 된 것 (다음 Lab에서 해결)
- ❌ SQS 메시지를 꺼내서 공장 API를 호출하는 **Lambda**가 없음
- ❌ 공장에서 생산 완료 후 재고를 충전하는 **입고 경로**가 없음

---

## 트러블슈팅

### 서버 로그에 여전히 `[SNS 미설정]` 표시
→ `.env`의 `ORDERING_TOPIC_ARN` 값이 올바른지 확인. `arn:aws:sns:`로 시작해야 합니다.
→ `.env` 수정 후 **서버를 재시작**했는지 확인.

### SQS에 메시지가 도착하지 않음
→ SNS 토픽 → 구독 탭에서 3개 구독이 **확인됨** 상태인지 확인.
→ SQS 큐의 **액세스 정책**에서 SNS의 `sqs:SendMessage` 권한이 있는지 확인.
→ 필터 정책의 JSON 형식이 올바른지 확인 (`{"category": ["engine"]}`)

### "Access Denied" 에러
→ Cloud9 EC2의 IAM 역할에 `sns:Publish` 권한이 있는지 확인.
```bash
aws sts get-caller-identity
aws sns publish --topic-arn <ORDERING_TOPIC_ARN> --message "test" --region us-east-1
```

---

