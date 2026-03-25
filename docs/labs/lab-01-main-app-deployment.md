# Lab 01: 메인 앱 배포 (90분)

## 목표
Cloud9 환경에서 프론트엔드를 S3에 배포하고, 메인 앱서버를 실행하고,
DynamoDB를 연결하여 차량 주문 시스템을 완성한다.

## 사전 준비
- Cloud9 IDE 환경 (m5.large)
- 소스 코드 클론 완료: `git clone https://github.com/glen15/Nxt-MSA.git`
- 공장 서버 IP: 강사가 제공 (예: `13.125.138.248`)

## 전체 흐름

```
Step 1  S3에 프론트엔드 배포        → 브라우저에서 열림, "서버 연결 실패"
Step 2  Cloud9에서 메인 앱 시작     → 서버는 뜨지만 API 호출 시 에러
Step 3  DynamoDB 테이블 생성        → 빈 테이블, 데이터 없음
Step 4  시드 데이터 입력            → 재고 데이터 3건
Step 5  전체 연결 확인              → 주문 → 재고 차감 → 발주
```

> 💡 의도적으로 "실패 → 원인 파악 → 해결" 순서로 진행합니다.
> 에러 메시지를 읽고 무엇이 빠졌는지 스스로 찾아보세요.

---

## Step 1: S3에 프론트엔드 배포 (20분)

### 1-1. S3 버킷 생성

1. AWS 콘솔 → S3 → **버킷 만들기**
2. 버킷 이름: `nxt-msa-<본인이름>-frontend` (전세계 고유해야 함)
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
2. 아래 JSON 붙여넣기 (버킷이름 교체):

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::버킷이름넣기/*"
  }]
}
```

### 1-4. 프론트엔드 빌드

프론트엔드는 Vite로 빌드합니다. `npm run build`를 실행하면 `dist/` 폴더에 배포용 파일이 생성됩니다.

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
> 브라우저가 효율적으로 로드할 수 있는 형태로 만드는 과정입니다.

### 1-5. S3에 업로드

빌드 결과물(`dist/` 폴더)을 S3에 업로드합니다:

```bash
aws s3 sync dist/ s3://<버킷이름>/ --delete
```

> `sync --delete`는 변경된 파일만 업로드하고, S3에만 남은 파일은 삭제합니다.
> `cp --recursive`와 달리 이전 빌드의 잔여 파일을 자동 정리합니다.

### 1-6. 브라우저에서 확인

S3 정적 웹사이트 엔드포인트를 브라우저에서 열기:

```
http://<버킷이름>.s3-website-us-east-1.amazonaws.com
```

**예상 결과:**
- ✅ NxtCar 페이지가 열림 (HTML/CSS/JS 로드)
- ❌ "서버 연결 실패" 표시
- ❌ 재고/주문 데이터 없음

> 🤔 **생각해보기**: 왜 "서버 연결 실패"인가?
> 빌드할 때 `VITE_API_BASE`를 지정하지 않았으므로 빈 문자열이 들어갔다.
> 프론트엔드는 자기 자신(S3)에게 `/api/health`를 요청하지만, S3는 API 서버가 아니다.
> 서버가 준비되면 `VITE_API_BASE=http://<서버IP>:3000 npm run build`로 다시 빌드한다.

---

## Step 2: 메인 앱 서버 시작 (15분)

### 2-1. 의존성 설치

```bash
cd ~/environment/Nxt-MSA/main-app
npm install
```

### 2-2. 서버 실행

```bash
node src/app.js
```

**예상 출력:**
```
🚗 NxtCar 메인 앱서버
   포트: 3000
   리전: us-east-1
   공장 엔진: http://localhost:3001
   공장 타이어: http://localhost:3002
   공장 배터리: http://localhost:3003
   SNS 발주토픽: (미설정)
```

### 2-3. API 테스트 (새 터미널)

Cloud9에서 터미널을 하나 더 열고:

```bash
# 헬스 체크 — 성공해야 함
curl http://localhost:3000/api/health | jq
```

```bash
# 재고 조회 — DynamoDB 연결 실패 예상
curl http://localhost:3000/api/parts | jq
```

**예상 결과:**
- ✅ `/api/health` → 200 OK (서버 자체는 정상)
- ❌ `/api/parts` → 500 에러 또는 빈 응답 (DynamoDB 테이블이 없으므로)

> 🤔 **생각해보기**: 서버는 떴는데 왜 데이터를 못 읽는가?
> DynamoDB 테이블이 아직 생성되지 않았기 때문이다.

### 2-4. 프론트엔드에 서버 주소 연결

메인 앱 서버는 `frontend/dist/` 폴더도 정적 파일로 서빙합니다.
Cloud9 Preview로 확인합니다: (상단 메뉴 → Preview → Preview Running Application)

Cloud9 Preview에서 프론트엔드를 확인하면:
- ✅ "서버 연결됨" 표시 (same-origin이라 API_BASE 빈값으로 동작)
- ❌ 부품 데이터가 없음 ("부품 데이터가 없습니다" 또는 에러)

> 🤔 **생각해보기**: 서버는 떴고 연결도 됐는데 데이터가 없다. 왜? DynamoDB 테이블이 아직 없기 때문이다.

---

## Step 3: DynamoDB 테이블 생성 (15분)

### 3-1. Parts 테이블

1. AWS 콘솔 → DynamoDB → **테이블 만들기**
2. 테이블 이름: `Parts`
3. 파티션 키: `partId` (문자열)
4. 테이블 설정: **설정 사용자 지정**
5. 읽기/쓰기 용량 설정: **온디맨드**
6. **테이블 만들기**

### 3-2. Orders 테이블

1. **테이블 만들기**
2. 테이블 이름: `Orders`
3. 파티션 키: `orderId` (문자열)
4. 온디맨드 모드
5. **테이블 만들기**

### 3-3. PurchaseOrders 테이블

1. **테이블 만들기**
2. 테이블 이름: `PurchaseOrders`
3. 파티션 키: `purchaseOrderId` (문자열)
4. 온디맨드 모드
5. **테이블 만들기**

### 3-4. 테이블 생성 확인

```bash
aws dynamodb list-tables --region us-east-1
```

**예상 출력:**
```json
{
    "TableNames": [
        "Orders",
        "Parts",
        "PurchaseOrders"
    ]
}
```

### 3-5. 다시 API 테스트

```bash
curl http://localhost:3000/api/parts | jq
```

**예상 결과:**
- ✅ 에러 없이 응답 (`{ "parts": [] }`)
- ❌ 데이터가 비어있음

> 🤔 **생각해보기**: 테이블은 있는데 왜 비어있는가? 데이터를 아직 넣지 않았기 때문이다.

---

## Step 4: 시드 데이터 입력 (15분)

### 방법 A: AWS 콘솔에서 수동 입력

DynamoDB 콘솔 → Parts 테이블 → **항목 탐색** → **항목 만들기** → **JSON 보기** 켜기

아래 3건을 하나씩 입력합니다:

**ENGINE-V6 (V6 엔진)**
```json
{
  "partId": {"S": "ENGINE-V6"},
  "partName": {"S": "V6 엔진"},
  "category": {"S": "engine"},
  "currentStock": {"N": "50"},
  "threshold": {"N": "20"},
  "orderQuantity": {"N": "100"},
  "updatedAt": {"S": "2026-03-25T00:00:00Z"}
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
  "updatedAt": {"S": "2026-03-25T00:00:00Z"}
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
  "updatedAt": {"S": "2026-03-25T00:00:00Z"}
}
```

### 방법 B: CLI로 한 번에 입력 (빠른 방법)

```bash
aws dynamodb put-item --table-name Parts --item '{
  "partId":{"S":"ENGINE-V6"},"partName":{"S":"V6 엔진"},
  "category":{"S":"engine"},"currentStock":{"N":"50"},
  "threshold":{"N":"20"},"orderQuantity":{"N":"100"},
  "updatedAt":{"S":"2026-03-25T00:00:00Z"}
}' --region us-east-1

aws dynamodb put-item --table-name Parts --item '{
  "partId":{"S":"TIRE-R18"},"partName":{"S":"R18 타이어"},
  "category":{"S":"tire"},"currentStock":{"N":"200"},
  "threshold":{"N":"80"},"orderQuantity":{"N":"400"},
  "updatedAt":{"S":"2026-03-25T00:00:00Z"}
}' --region us-east-1

aws dynamodb put-item --table-name Parts --item '{
  "partId":{"S":"BATTERY-72KWH"},"partName":{"S":"72kWh 배터리"},
  "category":{"S":"battery"},"currentStock":{"N":"30"},
  "threshold":{"N":"10"},"orderQuantity":{"N":"50"},
  "updatedAt":{"S":"2026-03-25T00:00:00Z"}
}' --region us-east-1
```

### 4-1. 데이터 확인

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

## Step 5: 전체 연결 확인 (25분)

### 5-1. Cloud9 Preview에서 프론트엔드 확인

Cloud9 상단 메뉴 → Preview → Preview Running Application

- ✅ "서버 연결됨"
- ✅ 부품 재고 3개 표시 (엔진 50, 타이어 200, 배터리 30)
- ✅ 주문 버튼 3개 (세단/전기차/SUV)

### 5-2. 세단(내연기관) 주문

**세단** 버튼 클릭 또는:
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"vehicleModel":"sedan"}' | jq
```

**확인:**
- 엔진: 50 → **49** (-1)
- 타이어: 200 → **196** (-4)
- 배터리: 변동 없음 (30)

### 5-3. 전기차 주문

**전기차** 버튼 클릭 또는:
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"vehicleModel":"ev"}' | jq
```

**확인:**
- 엔진: 변동 없음 (49)
- 타이어: 196 → **192** (-4)
- 배터리: 30 → **28** (-2)

### 5-4. SUV(하이브리드) 주문

**SUV** 버튼 클릭 또는:
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"vehicleModel":"suv"}' | jq
```

**확인:**
- 엔진: 49 → **48** (-1)
- 타이어: 192 → **188** (-4)
- 배터리: 28 → **27** (-1)

### 5-5. S3 프론트엔드에 서버 연결 (선택)

S3에서도 API를 호출하려면 서버 URL을 넣고 다시 빌드합니다:

```bash
cd ~/environment/Nxt-MSA/frontend
VITE_API_BASE=http://<Cloud9퍼블릭IP>:3000 npm run build
aws s3 sync dist/ s3://<버킷이름>/ --delete
```

> S3 → EC2 크로스 오리진 호출이므로 서버에 CORS가 설정되어 있어야 합니다 (이미 적용됨).

### 5-6. 재고 부족 테스트 (선택)

배터리를 다 소진시켜 봅니다. 전기차를 반복 주문하면:
- 배터리가 임계치(10) 이하로 떨어지면 → 콘솔에 `[SNS 미설정] 발주 메시지 스킵` 로그 출력
- 이것이 다음 Lab에서 SNS/SQS를 연결하는 이유

---

## 핵심 확인 포인트

| # | 확인 항목 | 상태 |
|---|----------|------|
| 1 | S3 정적 웹사이트에서 페이지가 열리는가 | ☐ |
| 2 | Cloud9에서 `node src/app.js`로 서버가 뜨는가 | ☐ |
| 3 | DynamoDB 테이블 3개가 생성되었는가 | ☐ |
| 4 | Parts 테이블에 시드 데이터 3건이 있는가 | ☐ |
| 5 | `/api/parts`에서 재고 3건이 조회되는가 | ☐ |
| 6 | sedan 주문 → 엔진(-1), 타이어(-4) 차감 | ☐ |
| 7 | ev 주문 → 배터리(-2), 타이어(-4) 차감 | ☐ |
| 8 | suv 주문 → 엔진(-1), 타이어(-4), 배터리(-1) 차감 | ☐ |

---

## 교육 포인트 정리

### 이 Lab에서 배운 것
1. **Vite 빌드**: `npm run build` → dist/ → S3 업로드 (빌드 파이프라인)
2. **S3 정적 웹 호스팅**: 프론트엔드와 백엔드의 분리
3. **환경변수 주입**: `VITE_API_BASE`로 빌드 시 API URL 결정
4. **DynamoDB On-Demand**: 테이블 생성과 용량 모드 선택
5. **조건식 재고 차감**: `currentStock >= 요청수량`일 때만 차감 (동시성 안전)
6. **차량별 BOM(Bill of Materials)**: 같은 주문이지만 소비 부품이 다름

### 아직 안 된 것 (다음 Lab에서 해결)
- ❌ SNS 발주 토픽 미설정 → 재고 부족해도 공장에 알림이 안 감
- ❌ 공장 URL이 localhost → 실제 공장 서버와 연결 안 됨
- ❌ S3 프론트엔드에서 API 호출 → CORS 이슈 (Cloud9 Preview에서는 same-origin)

---

## 트러블슈팅

### "ResourceNotFoundException" 에러
→ DynamoDB 테이블이 생성되지 않았거나 이름이 다릅니다. `Parts` (대소문자 주의)

### "서버 연결 실패" 표시
→ 메인 앱 서버가 실행 중인지 확인 (`node src/app.js`가 떠있는지)

### "재고 데이터를 불러올 수 없습니다"
→ Cloud9의 IAM 역할에 DynamoDB 권한이 있는지 확인
```bash
aws sts get-caller-identity
aws dynamodb scan --table-name Parts --region us-east-1
```

### Cloud9 Preview가 안 열림
→ 보안 그룹에서 포트 3000이 열려있는지 확인. 또는 `Preview → Preview Running Application` 클릭.

---

## 다음
→ Lab 02: 공장 서버 탐험 — 강사의 공장 API에 curl로 요청 보내기
