# Lab 01: DynamoDB + 메인 앱 (60분)

## 목표
DynamoDB 테이블을 생성하고, 메인 앱서버를 로컬에서 실행하여 주문 생성과 재고 차감을 확인한다.

## Step 1: DynamoDB 테이블 생성 (콘솔)

### Parts 테이블
1. AWS 콘솔 → DynamoDB → 테이블 만들기
2. 테이블 이름: `Parts`
3. 파티션 키: `partId` (문자열)
4. 설정: 온디맨드 용량 모드
5. **테이블 만들기** 클릭

### Orders 테이블
- 테이블 이름: `Orders`
- 파티션 키: `orderId` (문자열)

### PurchaseOrders 테이블
- 테이블 이름: `PurchaseOrders`
- 파티션 키: `purchaseOrderId` (문자열)

## Step 2: 시드 데이터 입력

DynamoDB 콘솔 → Parts 테이블 → 항목 탐색 → 항목 만들기

### ENGINE-V6
```json
{
  "partId": "ENGINE-V6",
  "partName": "V6 엔진",
  "category": "engine",
  "currentStock": 50,
  "threshold": 20,
  "orderQuantity": 100,
  "updatedAt": "2026-03-23T00:00:00Z"
}
```

### TIRE-R18
```json
{
  "partId": "TIRE-R18",
  "partName": "R18 타이어",
  "category": "tire",
  "currentStock": 200,
  "threshold": 80,
  "orderQuantity": 400,
  "updatedAt": "2026-03-23T00:00:00Z"
}
```

### BATTERY-72KWH
```json
{
  "partId": "BATTERY-72KWH",
  "partName": "72kWh 배터리",
  "category": "battery",
  "currentStock": 30,
  "threshold": 10,
  "orderQuantity": 50,
  "updatedAt": "2026-03-23T00:00:00Z"
}
```

## Step 3: 메인 앱 로컬 실행

```bash
cd main-app
npm install
```

환경변수 설정:
```bash
export AWS_REGION=ap-northeast-2
export ENGINE_FACTORY_URL=http://<강사IP>:3001
export TIRE_FACTORY_URL=http://<강사IP>:3002
export BATTERY_FACTORY_URL=http://<강사IP>:3003
```

실행:
```bash
npm start
```

## Step 4: API 테스트

### 재고 확인
```bash
curl http://localhost:3000/api/parts | jq
```

### 세단 주문 (내연기관)
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"vehicleModel": "sedan"}' | jq
```

### 전기차 주문
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"vehicleModel": "ev"}' | jq
```

### 하이브리드 SUV 주문
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"vehicleModel": "suv"}' | jq
```

## 핵심 확인 포인트
- [ ] sedan 주문 → 엔진(-1), 타이어(-4) 차감, 배터리 변동 없음
- [ ] ev 주문 → 배터리(-2), 타이어(-4) 차감, 엔진 변동 없음
- [ ] suv 주문 → 엔진(-1), 타이어(-4), 배터리(-1) 전부 차감

> 💡 **교육 포인트**: 같은 "주문"이지만 차량 타입에 따라 소비하는 부품이 다르다.

## 다음
→ [Lab 02: S3 프론트엔드](lab-02-s3-frontend.md)
