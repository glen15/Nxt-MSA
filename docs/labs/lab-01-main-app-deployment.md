# Lab 01: NxtCar 메인 앱 배포 (90분)

## 목표
Cloud9에서 프론트엔드를 S3에 배포하고, API 서버를 실행하고,
DynamoDB를 연결하여 차량 주문 시스템을 완성한다.

## 사전 준비
- Cloud9 IDE 환경 (m5.large)
- 소스 코드 클론 완료: `git clone https://github.com/glen15/Nxt-MSA.git`
- 강사가 안내한 본인 유저 ID (예: `kmucd1-03`)

## 전체 흐름

```
Step 1  S3에 프론트엔드 배포        → 페이지는 열리지만 "서버 연결 실패"
Step 2  환경변수 설정 + 서버 시작   → DynamoDB 테이블 없음 표시
Step 3  DynamoDB 테이블 생성        → 빈 테이블, 데이터 없음
Step 4  시드 데이터 입력            → 재고 데이터 3건
Step 5  S3 프론트엔드 연결 + 확인   → 주문 → 재고 차감
```

> 💡 의도적으로 "실패 → 원인 파악 → 해결" 순서로 진행합니다.

---

## Step 1: S3에 프론트엔드 배포 (20분)

### 1-1. S3 버킷 생성

1. AWS 콘솔 → S3 → **버킷 만들기**
2. 버킷 이름: `nxtcar-<본인유저ID>` (예: `nxtcar-kmucd1-03`)
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
USER_PREFIX=kmucd1-03
APP_PORT=3000
AWS_REGION=us-east-1
```

> ⚠️ `USER_PREFIX`는 강사가 안내한 본인 번호를 정확히 입력하세요.
> 이 값으로 DynamoDB 테이블 이름이 결정됩니다 (예: `kmucd1-03-Parts`).

### 2-3. 의존성 설치 + 서버 시작

```bash
npm install
npm start
```

**예상 출력:**
```
🚗 NxtCar 메인 앱서버 (포트: 3000)
   유저: kmucd1-03
   리전: us-east-1

   [DynamoDB]
   ❌ kmucd1-03-Parts — 테이블 없음
   ❌ kmucd1-03-Orders — 테이블 없음
   ❌ kmucd1-03-PurchaseOrders — 테이블 없음

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

### 2-5. API 테스트 (새 터미널)

Cloud9에서 터미널을 하나 더 열고 (`+` 버튼 → New Terminal):

```bash
# 헬스 체크
curl http://localhost:3000/api/health | jq

# 재고 조회 — 에러 예상
curl http://localhost:3000/api/parts
```

**예상 결과:**
- ✅ `GET /api/health` → `{ "status": "running" }`
- ❌ `GET /api/parts` → 500 에러 (테이블 없음)

---

## Step 3: DynamoDB 테이블 생성 (15분)

본인 `USER_PREFIX`를 접두사로 테이블 3개를 생성합니다.

> 예: USER_PREFIX가 `kmucd1-03`이면 → `kmucd1-03-Parts`, `kmucd1-03-Orders`, `kmucd1-03-PurchaseOrders`

### 3-1. Parts 테이블

1. AWS 콘솔 → DynamoDB → **테이블 만들기**
2. 테이블 이름: `<USER_PREFIX>-Parts` (예: `kmucd1-03-Parts`)
3. 파티션 키: `partId` (문자열)
4. 테이블 설정: **설정 사용자 지정**
5. 읽기/쓰기 용량 설정: **온디맨드**
6. **테이블 만들기**

### 3-2. Orders 테이블

- 테이블 이름: `<USER_PREFIX>-Orders`
- 파티션 키: `orderId` (문자열)
- 온디맨드 모드

### 3-3. PurchaseOrders 테이블

- 테이블 이름: `<USER_PREFIX>-PurchaseOrders`
- 파티션 키: `purchaseOrderId` (문자열)
- 온디맨드 모드

### 3-4. 서버 재시작으로 확인

서버를 `Ctrl+C`로 중지 후 다시 시작합니다:

```bash
npm start
```

**예상 출력:**
```
   [DynamoDB]
   ✅ kmucd1-03-Parts — 연결됨 (0건)
   ✅ kmucd1-03-Orders — 연결됨 (0건)
   ✅ kmucd1-03-PurchaseOrders — 연결됨 (0건)
```

❌가 ✅로 바뀌었지만 아직 데이터가 0건입니다.

---

## Step 4: 시드 데이터 입력 (15분)

Parts 테이블에 초기 재고 데이터 3건을 입력합니다.

### 방법 A: AWS 콘솔에서 수동 입력

DynamoDB 콘솔 → `<USER_PREFIX>-Parts` 테이블 → **항목 탐색** → **항목 만들기** → **JSON 보기** 켜기

**ENGINE-V6 (V6 엔진)**
```json
{
  "partId": {"S": "ENGINE-V6"},
  "partName": {"S": "V6 엔진"},
  "category": {"S": "engine"},
  "currentStock": {"N": "50"},
  "threshold": {"N": "20"},
  "orderQuantity": {"N": "100"},
  "updatedAt": {"S": "2026-03-26T00:00:00Z"}
}
```

**TIRE-R18 (R18 타이어)**
```json
{
  "partId": {"S": "TIRE-R18"},
  "partName": {"S": "R18 타이어"},
  "category": {"S": "tire"},
  "currentStock": {"N": "200"},
  "threshold": {"N": "80"},
  "orderQuantity": {"N": "400"},
  "updatedAt": {"S": "2026-03-26T00:00:00Z"}
}
```

**BATTERY-72KWH (72kWh 배터리)**
```json
{
  "partId": {"S": "BATTERY-72KWH"},
  "partName": {"S": "72kWh 배터리"},
  "category": {"S": "battery"},
  "currentStock": {"N": "30"},
  "threshold": {"N": "10"},
  "orderQuantity": {"N": "50"},
  "updatedAt": {"S": "2026-03-26T00:00:00Z"}
}
```

### 방법 B: CLI로 한 번에 입력

> `<USER_PREFIX>`를 본인 값으로 바꿔서 실행하세요.

```bash
PREFIX=kmucd1-03

aws dynamodb put-item --table-name ${PREFIX}-Parts --item '{
  "partId":{"S":"ENGINE-V6"},"partName":{"S":"V6 엔진"},
  "category":{"S":"engine"},"currentStock":{"N":"50"},
  "threshold":{"N":"20"},"orderQuantity":{"N":"100"},
  "updatedAt":{"S":"2026-03-26T00:00:00Z"}
}' --region us-east-1

aws dynamodb put-item --table-name ${PREFIX}-Parts --item '{
  "partId":{"S":"TIRE-R18"},"partName":{"S":"R18 타이어"},
  "category":{"S":"tire"},"currentStock":{"N":"200"},
  "threshold":{"N":"80"},"orderQuantity":{"N":"400"},
  "updatedAt":{"S":"2026-03-26T00:00:00Z"}
}' --region us-east-1

aws dynamodb put-item --table-name ${PREFIX}-Parts --item '{
  "partId":{"S":"BATTERY-72KWH"},"partName":{"S":"72kWh 배터리"},
  "category":{"S":"battery"},"currentStock":{"N":"30"},
  "threshold":{"N":"10"},"orderQuantity":{"N":"50"},
  "updatedAt":{"S":"2026-03-26T00:00:00Z"}
}' --region us-east-1
```

### 4-1. API로 데이터 확인

```bash
curl http://localhost:3000/api/parts | jq
```

**예상 결과:**
```json
{
  "parts": [
    { "partId": "ENGINE-V6", "partName": "V6 엔진", "currentStock": 50, "threshold": 20 },
    { "partId": "TIRE-R18", "partName": "R18 타이어", "currentStock": 200, "threshold": 80 },
    { "partId": "BATTERY-72KWH", "partName": "72kWh 배터리", "currentStock": 30, "threshold": 10 }
  ]
}
```

---

## Step 5: S3 프론트엔드 연결 + 전체 확인 (25분)

### 5-1. S3에 API 서버 주소를 넣어 다시 빌드

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

### 5-2. S3 웹사이트에서 확인

브라우저에서 S3 엔드포인트를 새로고침합니다.

- ✅ "서버 연결됨" 표시
- ✅ 부품 재고 3개 (엔진 50, 타이어 200, 배터리 30)
- ✅ 주문 버튼 3개 (세단/전기차/SUV)

### 5-3. 세단(내연기관) 주문

**세단** 버튼 클릭

**확인:**
- 엔진: 50 → **49** (-1)
- 타이어: 200 → **196** (-4)
- 배터리: 변동 없음

### 5-4. 전기차 주문

**전기차** 버튼 클릭

**확인:**
- 엔진: 변동 없음
- 타이어: 196 → **192** (-4)
- 배터리: 30 → **28** (-2)

### 5-5. SUV(하이브리드) 주문

**SUV** 버튼 클릭

**확인:**
- 엔진: 49 → **48** (-1)
- 타이어: 192 → **188** (-4)
- 배터리: 28 → **27** (-1)

### 5-6. 재고 부족 테스트 (선택)

전기차를 반복 주문하여 배터리를 소진시켜 봅니다.

배터리가 임계치(10) 이하로 떨어지면 → 서버 콘솔에 `[SNS 미설정] 발주 메시지 스킵` 로그 출력

> 🤔 **생각해보기**: 재고가 부족한데 공장에 알림이 안 간다. 어떻게 해결할까?
> → 다음 Lab에서 SNS/SQS를 연결하여 자동 발주 경로를 만든다.

---

## 핵심 확인 포인트

| # | 확인 항목 | 상태 |
|---|----------|------|
| 1 | S3 정적 웹사이트에서 NxtCar 페이지가 열리는가 | ☐ |
| 2 | `.env` 설정 후 `npm start`로 서버가 뜨는가 | ☐ |
| 3 | 서버 로그에 DynamoDB ❌ 표시가 나오는가 | ☐ |
| 4 | 테이블 3개 생성 후 서버 재시작 → ✅로 바뀌는가 | ☐ |
| 5 | 시드 데이터 입력 후 `/api/parts`에서 3건 조회 | ☐ |
| 6 | S3 재빌드 후 "서버 연결됨" 표시 | ☐ |
| 7 | sedan 주문 → 엔진(-1), 타이어(-4) | ☐ |
| 8 | ev 주문 → 배터리(-2), 타이어(-4) | ☐ |
| 9 | suv 주문 → 엔진(-1), 타이어(-4), 배터리(-1) | ☐ |

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
예: `USER_PREFIX=kmucd1-03`이면 테이블은 `kmucd1-03-Parts`

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
