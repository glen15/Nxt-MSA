---
title: "Lab 01: 메인 앱 배포"
---


## 목표
Cloud9에서 프론트엔드를 S3에 배포하고, API 서버를 실행하고,
DynamoDB를 연결하여 차량 주문 시스템을 완성한다.

## 사전 준비
- Cloud9 IDE 환경 (m5.large)
- 소스 코드 클론 완료: `git clone https://github.com/glen15/Nxt-MSA.git`
- 강사가 안내한 본인 유저 ID (예: `kmucd1-99`)

## 전체 흐름

```
Step 1  S3에 프론트엔드 배포        → 페이지는 열리지만 "서버 연결 실패"
Step 2  환경변수 설정 + 서버 시작   → 서버 기동, DynamoDB 미연결
Step 3  S3 ↔ EC2 연결 확인        → "서버 연결됨" 표시, 데이터 없음
Step 4  DynamoDB 테이블 생성       → 빈 테이블
Step 5  시드 데이터 + 주문 테스트   → 재고 표시, 주문 가능
```

> 💡 의도적으로 "실패 → 원인 파악 → 해결" 순서로 진행합니다.

---

## Step 1: S3에 프론트엔드 배포 (20분)

### 1-1. S3 버킷 생성

1. AWS 콘솔 → S3 → **버킷 만들기**
2. 버킷 이름: `<본인유저ID>-s3` (예: `kmucd1-99-s3`)
3. 리전: `us-east-1` (버지니아)
4. **모든 퍼블릭 액세스 차단** → 체크 해제 + "현재 설정으로 인해..." 체크
5. 나머지 기본값 → **버킷 만들기**

### 1-2. 정적 웹사이트 호스팅 활성화

1. 생성한 버킷 클릭 → **속성** 탭
2. 맨 아래 **정적 웹사이트 호스팅** → 편집
3. **활성화** 선택
4. 인덱스 문서: `index.html`
5. **변경 사항 저장**

### 1-3. 버킷 정책 (퍼블릭 읽기)

1. **권한** 탭 → 버킷 정책 → **편집**
2. 아래 JSON 붙여넣기 (**버킷이름** 부분을 본인 버킷으로 교체):

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::본인버킷이름/*"
  }]
}
```

### 1-4. 프론트엔드 빌드

Cloud9 터미널에서:

```bash
cd ~/environment/Nxt-MSA/frontend
npm install
npm run build
```

**예상 출력:**
```
✓ 7 modules transformed.
dist/index.html                 2.46 kB
dist/assets/index-XXXXXXXX.css  3.45 kB
dist/assets/index-XXXXXXXX.js   5.24 kB
✓ built in 43ms
```

> 💡 **빌드란?** 여러 JS/CSS 파일을 하나로 묶고(번들링), 파일명에 해시를 붙여(캐시 무효화)
> 브라우저가 효율적으로 로드할 수 있게 만드는 과정입니다.

### 1-5. S3에 업로드

```bash
aws s3 sync dist/ s3://<버킷이름>/ --delete
```

> `sync --delete`는 변경된 파일만 업로드하고, S3에만 남은 옛 파일은 삭제합니다.

### 1-6. 브라우저에서 확인

S3 버킷 → 속성 → 정적 웹사이트 호스팅 → **엔드포인트 URL** 클릭

```
http://<버킷이름>.s3-website-us-east-1.amazonaws.com
```

**예상 결과:**
- ✅ NxtCar 페이지가 열림
- ❌ "서버 연결 확인 중..." 표시

> 🤔 **왜?** 빌드할 때 API 서버 주소를 지정하지 않아서, S3 자기 자신에게 API를 요청하고 있다. S3는 API 서버가 아니다.

---

## Step 2: 환경변수 설정 + 서버 시작 (15분)

### 2-1. 보안그룹에 포트 3000 열기

1. AWS 콘솔 → EC2 → **보안 그룹**
2. Cloud9에 연결된 보안그룹 선택 (이름에 `cloud9` 또는 `aws-cloud9`이 포함)
3. **인바운드 규칙** → **인바운드 규칙 편집**
4. **규칙 추가**:
   - 유형: **사용자 지정 TCP**
   - 포트 범위: `3000`
   - 소스: `0.0.0.0/0`
5. **규칙 저장**

> S3 프론트엔드가 Cloud9의 API 서버를 호출하려면 이 포트가 외부에서 접근 가능해야 합니다.

### 2-2. .env 파일 생성

```bash
cd ~/environment/Nxt-MSA/main-app
cp .env.example .env
```

`.env` 파일을 열어 `USER_PREFIX`를 **본인 유저 ID**로 변경합니다:

```
USER_PREFIX=kmucd1-99
APP_PORT=3000
AWS_REGION=us-east-1
```

> ⚠️ `USER_PREFIX`는 강사가 안내한 본인 번호를 정확히 입력하세요.
> 이 값으로 DynamoDB 테이블 이름이 결정됩니다 (예: `kmucd1-99-Parts`).

### 2-3. 의존성 설치 + 서버 시작

```bash
npm install
npm start
```

**예상 출력:**
```
🚗 NxtCar 메인 앱서버 (포트: 3000)
   유저: kmucd1-99
   리전: us-east-1

   [DynamoDB]
   ❌ kmucd1-99-Parts — 테이블 없음
   ❌ kmucd1-99-Orders — 테이블 없음
   ❌ kmucd1-99-PurchaseOrders — 테이블 없음

   [SNS]
   ❌ 발주토픽 — 미설정
```

서버가 정상적으로 떴지만, DynamoDB 테이블이 없다고 알려주고 있습니다.

### 2-4. 브라우저에서 API 확인

브라우저에서 Cloud9 EC2의 퍼블릭 IP + 포트 3000으로 접속합니다:

```
http://<Cloud9퍼블릭IP>:3000/
```

**예상 결과:** API 엔드포인트 목록 JSON이 표시됩니다.
```json
{
  "service": "NxtCar API",
  "endpoints": {
    "health": "GET /api/health",
    "parts": "GET /api/parts",
    "orders": "GET /api/orders | POST /api/orders",
    "purchaseOrders": "GET /api/purchase-orders"
  }
}
```

> 💡 이 서버는 API 전용입니다. 프론트엔드(HTML)는 S3가 담당하고, 이 서버는 데이터만 제공합니다.

---

## Step 3: S3 ↔ EC2 연결 확인 (10분)

### 3-1. S3에 API 서버 주소를 넣어 다시 빌드

Cloud9 EC2의 퍼블릭 IP를 확인합니다:

```bash
curl http://checkip.amazonaws.com
```

프론트엔드를 API 서버 주소와 함께 다시 빌드합니다:

```bash
cd ~/environment/Nxt-MSA/frontend
VITE_API_BASE=http://<퍼블릭IP>:3000 npm run build
aws s3 sync dist/ s3://<버킷이름>/ --delete
```

### 3-2. S3 웹사이트에서 확인

브라우저에서 S3 엔드포인트를 새로고침합니다.

- ✅ **"서버 연결됨"** 표시
- ❌ 부품 데이터 없음 (DynamoDB가 아직 없으므로)

> 🤔 **왜 데이터가 안 보일까?** S3 → EC2 연결은 성공했지만, DynamoDB 테이블이 아직 없어서 데이터를 불러올 수 없다.
> → 다음 Step에서 DynamoDB를 구성합니다.

---

## Step 4: DynamoDB 테이블 생성 (15분)

### DynamoDB란?

AWS의 NoSQL 데이터베이스입니다. RDB(MySQL, PostgreSQL)와 다른 점:

| | RDB | DynamoDB |
|---|---|---|
| 스키마 | 테이블 생성 시 컬럼 정의 필수 | **파티션 키만** 정하면 됨. 나머지 필드는 자유 |
| 조회 | `WHERE` 절로 아무 컬럼 검색 | **파티션 키**로 조회해야 빠름 |
| 확장 | 서버 스펙 업그레이드 (Scale-up) | 자동 분산 (Scale-out) |
| 용량 | 서버를 미리 준비 | **온디맨드**: 쓴 만큼만 과금 |

**파티션 키**는 각 항목을 찾는 고유 주소입니다. DynamoDB는 이 키를 해시해서 데이터를 물리적으로 분산 저장합니다. 테이블이 아무리 커져도 파티션 키로 조회하면 항상 빠릅니다.

우리가 만들 테이블 3개:

| 테이블 | 파티션 키 | 저장하는 것 | 예시 |
|--------|----------|-----------|------|
| Parts | `partId` | 부품 재고 | `ENGINE-V6`, `TIRE-R18`, `BATTERY-72KWH` |
| Orders | `orderId` | 차량 주문 | UUID (주문할 때마다 생성) |
| PurchaseOrders | `purchaseOrderId` | 공장 발주 | UUID (재고 부족 시 생성) |

본인 `USER_PREFIX`를 접두사로 테이블 3개를 생성합니다.

> 예: USER_PREFIX가 `kmucd1-99`이면:
>
> | 테이블 이름 | 파티션 키 | 타입 |
> |------------|----------|------|
> | `kmucd1-99-Parts` | `partId` | 문자열 |
> | `kmucd1-99-Orders` | `orderId` | 문자열 |
> | `kmucd1-99-PurchaseOrders` | `purchaseOrderId` | 문자열 |

### 4-1. Parts 테이블

1. AWS 콘솔 → **DynamoDB** → 왼쪽 메뉴 **테이블** → **테이블 만들기**
2. 테이블 이름: `<USER_PREFIX>-Parts` (예: `kmucd1-99-Parts`)
3. 파티션 키: `partId` — 타입: **문자열**
4. 정렬 키: 비워두기 (사용 안 함)
5. 테이블 설정: **기본 설정** 그대로 (온디맨드 모드)
6. **테이블 만들기**

> 상태가 "생성 중"에서 **"활성"**으로 바뀔 때까지 기다려주세요 (약 10초).

### 4-2. Orders 테이블

같은 방법으로 두 번째 테이블을 만듭니다:

1. **테이블 만들기** 클릭
2. 테이블 이름: `<USER_PREFIX>-Orders` (예: `kmucd1-99-Orders`)
3. 파티션 키: `orderId` — 타입: **문자열**
4. 기본 설정 그대로 → **테이블 만들기**

### 4-3. PurchaseOrders 테이블

세 번째 테이블:

1. **테이블 만들기** 클릭
2. 테이블 이름: `<USER_PREFIX>-PurchaseOrders` (예: `kmucd1-99-PurchaseOrders`)
3. 파티션 키: `purchaseOrderId` — 타입: **문자열**
4. 기본 설정 그대로 → **테이블 만들기**

### 4-4. 테이블 확인

DynamoDB 콘솔 왼쪽 메뉴 → **테이블**에서 본인 접두사로 시작하는 테이블 3개가 모두 **"활성"** 상태인지 확인합니다.

### 4-5. 서버 재시작으로 확인

Cloud9 터미널에서 서버를 `Ctrl+C`로 중지 후 다시 시작합니다:

```bash
npm start
```

**예상 출력:**
```
   [DynamoDB]
   ✅ kmucd1-99-Parts — 연결됨 (0건)
   ✅ kmucd1-99-Orders — 연결됨 (0건)
   ✅ kmucd1-99-PurchaseOrders — 연결됨 (0건)
```

❌가 ✅로 바뀌었습니다! 하지만 아직 데이터가 0건입니다.

> 🤔 **생각해보기**: 테이블은 만들어졌는데 왜 프론트엔드에 부품이 안 보이는가? 테이블이 비어있기 때문이다.

---

## Step 5: 시드 데이터 입력 + 주문 테스트 (20분)

Parts 테이블에 초기 재고 데이터 3건을 입력합니다. 3가지 방법 중 하나를 선택하세요.

> 💡 **부품별 의미:**
> - `currentStock`: 현재 재고 수량
> - `threshold`: 이 수치 이하로 떨어지면 자동 발주 트리거
> - `orderQuantity`: 발주 시 요청하는 수량

### 방법 A: 콘솔에서 항목 만들기 (1건씩)

DynamoDB의 기본적인 데이터 입력 방법입니다. 1건씩 반복합니다.

1. DynamoDB 콘솔 → `<USER_PREFIX>-Parts` 테이블 클릭
2. **항목 탐색** 탭 → **항목 만들기**
3. 오른쪽 상단 **JSON 보기** 토글 켜기
4. 기존 내용을 지우고 아래 JSON을 붙여넣고 **항목 만들기** 클릭

**① ENGINE-V6 (V6 엔진)**
```json
{
  "partId": {"S": "ENGINE-V6"},
  "partName": {"S": "V6 엔진"},
  "category": {"S": "engine"},
  "currentStock": {"N": "10"},
  "threshold": {"N": "5"},
  "orderQuantity": {"N": "20"},
  "updatedAt": {"S": "2026-03-26T00:00:00Z"}
}
```

같은 방법으로 나머지 2건도 입력합니다 (**항목 만들기** → JSON 보기 → 붙여넣기 → 항목 만들기):

**② TIRE-R18 (R18 타이어)**
```json
{
  "partId": {"S": "TIRE-R18"},
  "partName": {"S": "R18 타이어"},
  "category": {"S": "tire"},
  "currentStock": {"N": "40"},
  "threshold": {"N": "20"},
  "orderQuantity": {"N": "80"},
  "updatedAt": {"S": "2026-03-26T00:00:00Z"}
}
```

**③ BATTERY-72KWH (72kWh 배터리)**
```json
{
  "partId": {"S": "BATTERY-72KWH"},
  "partName": {"S": "72kWh 배터리"},
  "category": {"S": "battery"},
  "currentStock": {"N": "8"},
  "threshold": {"N": "3"},
  "orderQuantity": {"N": "10"},
  "updatedAt": {"S": "2026-03-26T00:00:00Z"}
}
```

> ⚠️ **DynamoDB JSON 형식에 주의하세요.**
> 일반 JSON: `"currentStock": 50`
> DynamoDB JSON: `"currentStock": {"N": "50"}`
>
> `{"S": "..."}` = 문자열(String), `{"N": "..."}` = 숫자(Number)
> 숫자도 문자열로 감싸야 합니다 (`"50"`, `"200"` 등)

### 방법 B: CLI batch-write (Cloud9에서 한 명령으로)

Cloud9 터미널에서 3건을 한번에 넣습니다. 테이블 이름을 본인 것으로 바꾸세요.

```bash
aws dynamodb batch-write-item --region us-east-1 --request-items '{
  "<USER_PREFIX>-Parts": [
    {"PutRequest":{"Item":{"partId":{"S":"ENGINE-V6"},"partName":{"S":"V6 엔진"},"category":{"S":"engine"},"currentStock":{"N":"10"},"threshold":{"N":"5"},"orderQuantity":{"N":"20"},"updatedAt":{"S":"2026-03-26T00:00:00Z"}}}},
    {"PutRequest":{"Item":{"partId":{"S":"TIRE-R18"},"partName":{"S":"R18 타이어"},"category":{"S":"tire"},"currentStock":{"N":"40"},"threshold":{"N":"20"},"orderQuantity":{"N":"80"},"updatedAt":{"S":"2026-03-26T00:00:00Z"}}}},
    {"PutRequest":{"Item":{"partId":{"S":"BATTERY-72KWH"},"partName":{"S":"72kWh 배터리"},"category":{"S":"battery"},"currentStock":{"N":"8"},"threshold":{"N":"3"},"orderQuantity":{"N":"10"},"updatedAt":{"S":"2026-03-26T00:00:00Z"}}}}
  ]
}'
```

### 4-1. 콘솔에서 확인

어떤 방법을 사용했든, DynamoDB 콘솔 → `<USER_PREFIX>-Parts` → **항목 탐색** 탭에서 3개 항목:

| partId | partName | currentStock | threshold | orderQuantity |
|--------|----------|:------------:|:---------:|:-------------:|
| ENGINE-V6 | V6 엔진 | 10 | 5 | 20 |
| TIRE-R18 | R18 타이어 | 40 | 20 | 80 |
| BATTERY-72KWH | 72kWh 배터리 | 8 | 3 | 10 |

### 4-2. API로 데이터 확인

Cloud9 터미널에서:

```bash
curl http://localhost:3000/api/parts | jq
```

**예상 결과:**
```json
{
  "parts": [
    { "partId": "ENGINE-V6", "partName": "V6 엔진", "currentStock": 10, "threshold": 5 },
    { "partId": "TIRE-R18", "partName": "R18 타이어", "currentStock": 40, "threshold": 20 },
    { "partId": "BATTERY-72KWH", "partName": "72kWh 배터리", "currentStock": 8, "threshold": 3 }
  ]
}
```

### 5-3. 프론트엔드에서 확인

브라우저에서 S3 엔드포인트를 새로고침합니다.

- ✅ "서버 연결됨" 표시
- ✅ 부품 재고 3개 (엔진 10, 타이어 40, 배터리 8)
- ✅ 주문 버튼 3개 (세단/전기차/SUV)
- ✅ 🔄 재고 초기화 버튼

> 💡 재고가 엉망이 되면 **🔄 재고 초기화** 버튼을 누르면 언제든 초기값으로 복원됩니다.

### 5-4. 세단(내연기관) 주문

**세단** 버튼 클릭

**확인:**
- 엔진: 10 → **9** (-1)
- 타이어: 40 → **36** (-4)
- 배터리: 변동 없음

### 5-5. 전기차 주문

**전기차** 버튼 클릭

**확인:**
- 엔진: 변동 없음
- 타이어: 36 → **32** (-4)
- 배터리: 8 → **6** (-2)

### 5-6. SUV(하이브리드) 주문

**SUV** 버튼 클릭

**확인:**
- 엔진: 9 → **8** (-1)
- 타이어: 32 → **28** (-4)
- 배터리: 6 → **5** (-1)

### 5-7. 재고 부족 테스트

전기차를 2번 더 주문하면 배터리가 임계치(3) 이하로 떨어집니다.

**확인:**
- 배터리: 5 → 3 → **1** (임계치 3 이하!)
- 발주 현황에 **"발주 대기 (SNS 미연결)"** 상태가 표시됨
- 서버 콘솔에 `[SNS 미설정] 발주 메시지 스킵` 로그 출력

> 🤔 **생각해보기**: 재고가 부족하면 자동으로 발주가 만들어지지만, SNS가 연결되지 않아서 공장까지 전달이 안 된다.
> 발주 상태가 `ORDERED`(발주됨)가 아닌 `PENDING`(발주 대기)인 이유다.
> → 다음 Lab에서 SNS/SQS를 연결하면 `ORDERED`로 바뀌고 공장에 실제로 전달된다.

> 💡 재고 초기화 버튼을 눌러서 재고를 되돌린 뒤 다시 테스트할 수 있습니다.

---

## 핵심 확인 포인트

| # | 확인 항목 | 상태 |
|---|----------|------|
| 1 | S3 정적 웹사이트에서 NxtCar 페이지가 열리는가 | ☐ |
| 2 | `.env` 설정 후 `npm start`로 서버가 뜨는가 | ☐ |
| 3 | S3 재빌드 후 "서버 연결됨" 표시 | ☐ |
| 4 | DynamoDB 테이블 3개 생성 후 서버 재시작 → ✅ 표시 | ☐ |
| 5 | 시드 데이터 입력 후 프론트엔드에 재고 3건 표시 | ☐ |
| 6 | sedan 주문 → 엔진(-1), 타이어(-4) | ☐ |
| 7 | ev 주문 → 배터리(-2), 타이어(-4) | ☐ |
| 8 | suv 주문 → 엔진(-1), 타이어(-4), 배터리(-1) | ☐ |

---

## 교육 포인트 정리

### 이 Lab에서 배운 것
1. **Vite 빌드**: `npm run build` → `dist/` → S3 업로드 (빌드 파이프라인)
2. **S3 정적 웹 호스팅**: 프론트엔드와 백엔드의 분리 (프레젠테이션 vs API)
3. **환경변수**: `.env`로 설정 관리, `VITE_API_BASE`로 빌드 시 API URL 주입
4. **DynamoDB On-Demand**: 테이블 생성, 파티션 키, 용량 모드
5. **조건식 재고 차감**: `currentStock >= 요청수량`일 때만 차감 (동시성 안전)
6. **차량별 BOM**: 같은 "주문"이지만 차량 타입에 따라 소비 부품이 다름

### 아직 안 된 것 (다음 Lab에서 해결)
- ❌ 재고 부족해도 공장에 자동 발주가 안 감 (SNS 미설정)
- ❌ 공장에서 생산 완료해도 재고가 안 올라감 (입고 경로 미구성)

---

## 트러블슈팅

### 서버 로그에 `❌ ... 테이블 없음`
→ DynamoDB 테이블 이름이 `.env`의 `USER_PREFIX`와 일치하는지 확인.
예: `USER_PREFIX=kmucd1-99`이면 테이블은 `kmucd1-99-Parts`

### `GET /api/parts` 500 에러
→ 서버 로그의 DynamoDB 상태를 확인하세요. 테이블이 없거나 IAM 권한이 부족할 수 있습니다.
```bash
aws sts get-caller-identity
aws dynamodb describe-table --table-name <USER_PREFIX>-Parts --region us-east-1
```

### S3에서 "서버 연결 확인 중..." 계속 표시
→ `VITE_API_BASE`를 넣고 다시 빌드했는지 확인. Cloud9 보안그룹에 포트 3000이 열려있는지 확인.

### Cloud9에서 포트가 8080으로 뜸
→ Cloud9이 `PORT=8080`을 자동 세팅합니다. NxtCar는 `APP_PORT`를 사용하므로 영향 없이 3000으로 뜹니다.

---

## 다음
→ Lab 02: 공장 서버 탐험 — 강사의 공장 API에 curl로 요청 보내기
