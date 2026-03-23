# Lab 07: 장애와 복구 — 핵심 실습 (45분)

## 목표
강사가 장애 주입 API로 공장 서버에 다양한 장애를 발생시키고,
MSA에서 장애가 어떻게 격리되고 복구되는지 체험한다.

> ⚠️ 이 Lab은 **강사가 시연**하고 학생이 결과를 관찰하는 방식.

## 실험 1: 엔진 공장 셧다운

### 장애 주입 (강사)
```bash
curl -X POST http://<강사IP>:3001/admin/chaos \
  -H "Content-Type: application/json" \
  -d '{"type": "shutdown", "durationSeconds": 120}'
```

### 관찰 (학생)
```bash
# sedan 주문 생성 → 엔진 발주 실패 예상
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"vehicleModel": "sedan"}'

# ev 주문 생성 → 엔진 불필요, 정상 작동!
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"vehicleModel": "ev"}'
```

### 확인 포인트
- [ ] 메인 앱은 정상 동작하는가? → **YES** (Loose Coupling)
- [ ] ev 주문은 영향 없는가? → **YES** (엔진 불필요)
- [ ] SQS `engine-order` 큐에 메시지가 쌓이는가? → **YES**
- [ ] DLQ에 메시지가 이동하는가? (3회 재시도 후)

## 실험 2: 공장 복구 + DLQ Redrive

### 복구 (강사)
```bash
curl -X DELETE http://<강사IP>:3001/admin/chaos
```

### DLQ Redrive (학생)
1. SQS 콘솔 → `engine-order-dlq`
2. **DLQ Redrive 시작** 클릭
3. 대상: `engine-order` 큐
4. DLQ의 메시지가 원래 큐로 돌아감
5. Lambda가 재처리 → CloudWatch 로그에서 성공 확인

> 💡 **교육 포인트**: 공장이 죽어있는 동안 메시지는 안전하게 보관되었고, 복구 후 자동으로 처리된다.

## 실험 3: 타이어 공장 지연

### 장애 주입 (강사)
```bash
curl -X POST http://<강사IP>:3002/admin/chaos \
  -H "Content-Type: application/json" \
  -d '{"type": "delay", "durationSeconds": 120, "delayMs": 35000}'
```

### 관찰 (학생)
- Lambda 타임아웃은 30초 → 35초 지연이면 타임아웃!
- CloudWatch 로그에서 `Task timed out` 확인
- 모든 차량 타입이 영향받음 (타이어는 공통 부품)

### 복구 (강사)
```bash
curl -X DELETE http://<강사IP>:3002/admin/chaos
```

> 💡 **교육 포인트**: Lambda 타임아웃 설정이 중요한 이유. 공장 응답이 느리면 재시도 비용이 발생한다.

## 실험 4: 배터리 공장 간헐적 실패

### 장애 주입 (강사)
```bash
curl -X POST http://<강사IP>:3003/admin/chaos \
  -H "Content-Type: application/json" \
  -d '{"type": "error-rate", "durationSeconds": 120, "errorRate": 0.5}'
```

### 관찰 (학생)
- ev/suv 주문만 영향 (배터리 필요 차량)
- sedan 주문은 정상 (배터리 불필요)
- 50% 확률 실패 → 일부는 성공, 일부는 DLQ로
- SQS 콘솔에서 `battery-order-dlq` 확인

### 복구 (강사)
```bash
curl -X DELETE http://<강사IP>:3003/admin/chaos
```

> 💡 **교육 포인트**: 부분 실패(Partial Failure)는 MSA에서 일상. DLQ가 안전망 역할.

## 정리 — 장애 격리 매트릭스

| 장애 대상 | sedan (내연) | ev (전기) | suv (하이브리드) |
|-----------|:-----------:|:--------:|:---------------:|
| 엔진 공장 다운 | ❌ 영향 | ✅ 정상 | ❌ 영향 |
| 타이어 공장 다운 | ❌ 영향 | ❌ 영향 | ❌ 영향 |
| 배터리 공장 다운 | ✅ 정상 | ❌ 영향 | ❌ 영향 |
| 메인 앱 | ✅ 항상 정상 | ✅ 항상 정상 | ✅ 항상 정상 |

## 다음
→ [Lab 08: 전체 통합](lab-08-full-integration.md)
